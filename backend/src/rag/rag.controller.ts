import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { IngestionService } from "./ingestion.service";
import { EmbeddingsService } from "./embeddings.service";
import { VectorStoreService, EMBEDDING_DIM } from "./vector-store.service";
import { RetrievalService } from "./retrieval.service";
import { QueryRewriterService } from "./query-rewriter.service";
import { RouterService } from "./router.service";
import { CATEGORIES } from "./rag.types";
import { RagConfig } from "./rag.config";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionCode } from "../auth/constants/permissions.enum";
import * as fs from "fs/promises";
import * as path from "path";

const pdfParse = require("pdf-parse");

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream", // algunos clientes mandan .md como octet
]);

@UseGuards(PermissionsGuard)
@RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
@Controller("admin/rag")
export class RagController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly emb: EmbeddingsService,
    private readonly vec: VectorStoreService,
    private readonly retrieval: RetrievalService,
    private readonly rewriter: QueryRewriterService,
    private readonly router: RouterService,
    private readonly cfg: RagConfig,
  ) {}

  @Get("config")
  config() {
    return this.cfg.snapshot();
  }

  /**
   * Diagnóstico completo del pipeline RAG para una query.
   * POST /admin/rag/diagnose  { "query": "horarios de Francia Federico" }
   * Muestra: rewrite, intent, FTS hits, KNN hits, chunks encontrados.
   */
  @Post("diagnose")
  async diagnose(@Body() body: { query: string }) {
    if (!body?.query) throw new BadRequestException("query requerida");

    const t0 = Date.now();

    // 1. Rewrite
    const rewritten = await this.rewriter.rewrite([], body.query);

    // 2. Intent
    const intent = this.router.classify(rewritten);
    const k = this.router.dynamicK(rewritten);
    const category = intent.categoryConfident ? intent.category : undefined;

    // 3. FTS
    const ftsHits = await this.vec.ftsAsync({ query: rewritten, k: k * 3, category });

    // 4. KNN
    let vecHits: any[] = [];
    let embError: string | null = null;
    let embDim = 0;
    try {
      const [qEmb] = await this.emb.embed([rewritten], "query");
      embDim = qEmb.length;
      vecHits = await this.vec.knnAsync({ embedding: qEmb, k: k * 3, category });
    } catch (e) {
      embError = (e as Error).message;
    }

    // 5. Conteo en kb_vectors vía FTS con query vacía (match-all)
    const totalVectors = await this.vec.countVectors();

    return {
      query: body.query,
      rewritten,
      intent,
      k,
      category,
      totalVectorsInDB: totalVectors,
      fts: { hits: ftsHits.length, topScore: ftsHits[0]?.score ?? 0, results: ftsHits.slice(0, 3) },
      knn: { hits: vecHits.length, topScore: vecHits[0]?.score ?? 0, embDim, embError, results: vecHits.slice(0, 3) },
      latencyMs: Date.now() - t0,
    };
  }

  @Get("health")
  async health() {
    const t0 = Date.now();
    let embOk = false;
    let embDim = 0;
    let embError: string | null = null;
    try {
      const [v] = await this.emb.embed(["health check mutualyf"]);
      embOk = v instanceof Float32Array && v.length === EMBEDDING_DIM;
      embDim = v?.length ?? 0;
    } catch (e) {
      embError = (e as Error).message;
    }
    return {
      ok: embOk,
      embedModel: this.emb.model,
      expectedDim: EMBEDDING_DIM,
      actualDim: embDim,
      latencyMs: Date.now() - t0,
      error: embError,
      categories: CATEGORIES,
    };
  }

  @Get("docs")
  list() {
    return this.ingestion.listDocs();
  }

  @Get("docs/:id")
  async getOne(@Param("id", ParseIntPipe) id: number) {
    const doc = await this.ingestion.getDoc(id);
    if (!doc) throw new NotFoundException("Doc not found");
    return doc;
  }

  @Post("docs")
  create(
    @Body()
    body: {
      title: string;
      source: string;
      category: string;
      content: string;
    },
  ) {
    return this.ingestion.ingestText(body);
  }

  @Delete("docs/:id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.ingestion.deleteDoc(id);
    return { ok: true };
  }

  @Throttle({ default: { ttl: 300_000, limit: 2 } })
  @Post("rebuild")
  rebuild() {
    return this.ingestion.rebuildIndex();
  }

  /**
   * Bulk-ingest desde una carpeta del filesystem del server.
   * Estructura esperada:
   *   <dir>/<category>/<file>.(pdf|md|txt)
   * donde <category> ∈ CATEGORIES. Ideal para entrenar en bulk con un rsync/scp
   * a la carpeta, sin armar un script aparte.
   *
   * Default: prisma/data/knowledge/ (overrideable con RAG_KNOWLEDGE_DIR env).
   */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("ingest-folder")
  async ingestFolder(@Body() body: { dir?: string }) {
    const baseDir =
      body?.dir ||
      process.env.RAG_KNOWLEDGE_DIR ||
      path.resolve(process.cwd(), "prisma", "data", "knowledge");

    const stat = await fs.stat(baseDir).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new BadRequestException(`Not a directory: ${baseDir}`);
    }

    const results: Array<{
      file: string;
      category: string;
      docId?: number;
      chunks?: number;
      skipped?: boolean;
      reason?: string;
      error?: string;
    }> = [];
    const categories = await fs.readdir(baseDir, { withFileTypes: true });

    for (const catDir of categories) {
      if (!catDir.isDirectory()) continue;
      const category = catDir.name;
      if (!CATEGORIES.includes(category as any)) {
        results.push({
          file: catDir.name,
          category,
          error: "invalid category",
        });
        continue;
      }

      const catPath = path.join(baseDir, category);
      const files = await fs.readdir(catPath, { withFileTypes: true });

      for (const f of files) {
        if (!f.isFile()) continue;
        if (!/\.(pdf|md|markdown|txt)$/i.test(f.name)) continue;
        const full = path.join(catPath, f.name);
        try {
          const buf = await fs.readFile(full);
          const content = /\.pdf$/i.test(f.name)
            ? String((await require("pdf-parse")(buf))?.text || "")
            : buf.toString("utf8");

          if (content.trim().length < 40) {
            results.push({
              file: f.name,
              category,
              skipped: true,
              reason: "empty or scanned",
            });
            continue;
          }

          const r = await this.ingestion.ingestText({
            title: f.name.replace(/\.(pdf|md|markdown|txt)$/i, ""),
            source: `folder:${category}/${f.name}`,
            category,
            content,
          });
          results.push({ file: f.name, category, ...r });
        } catch (e) {
          results.push({ file: f.name, category, error: (e as Error).message });
        }
      }
    }

    return {
      dir: baseDir,
      total: results.length,
      ingested: results.filter((r) => r.docId && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => r.error).length,
      results,
    };
  }

  @Post("pull-model")
  async pullModel() {
    const pull = await this.emb.pullModel();
    // Tras pullear, reintenta el health check para confirmar
    const health = await this.health();
    return { pull, health };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; category?: string },
  ) {
    if (!file)
      throw new BadRequestException(
        'file is required (multipart field "file")',
      );
    if (!body?.category || !CATEGORIES.includes(body.category as any)) {
      throw new BadRequestException(
        `category required. Allowed: ${CATEGORIES.join(", ")}`,
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `file too large (max ${MAX_UPLOAD_BYTES} bytes)`,
      );
    }
    if (
      !ALLOWED_MIMES.has(file.mimetype) &&
      !/\.(pdf|md|markdown|txt)$/i.test(file.originalname)
    ) {
      throw new BadRequestException(
        `unsupported mime "${file.mimetype}" — accepted: pdf, md, txt`,
      );
    }

    const content = await this.extractText(file);
    if (content.trim().length < 40) {
      throw new BadRequestException(
        "extracted text too short — the file may be scanned/empty",
      );
    }

    return this.ingestion.ingestText({
      title: (body.title || file.originalname).slice(0, 200),
      source: `upload:${file.originalname}`,
      category: body.category,
      content,
    });
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    const isPdf =
      file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname);
    if (isPdf) {
      const data = await pdfParse(file.buffer);
      return String(data?.text || "");
    }
    return file.buffer.toString("utf8");
  }
}
