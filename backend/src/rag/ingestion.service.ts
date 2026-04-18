import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingsService } from "./embeddings.service";
import { VectorStoreService } from "./vector-store.service";
import { chunkText, estimateTokens } from "./chunker";
import { sanitizeChunk } from "./sanitizer";
import { Category, CATEGORIES } from "./rag.types";
import { RagConfig } from "./rag.config";
import { RetrievalService } from "./retrieval.service";

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emb: EmbeddingsService,
    private readonly vec: VectorStoreService,
    private readonly cfg: RagConfig,
    @Inject(forwardRef(() => RetrievalService))
    private readonly retrieval: RetrievalService,
  ) {}

  async ingestText(input: {
    title: string;
    source: string;
    category: string;
    content: string;
  }): Promise<{
    docId: number;
    chunks: number;
    skipped?: boolean;
    reason?: string;
  }> {
    if (!CATEGORIES.includes(input.category as Category)) {
      throw new BadRequestException(
        `Invalid category. Allowed: ${CATEGORIES.join(", ")}`,
      );
    }
    const cleanContent = input.content.trim();
    if (cleanContent.length < 40) {
      throw new BadRequestException("Content too short (min 40 chars)");
    }
    if (cleanContent.length > 2_000_000) {
      throw new BadRequestException("Content too large (max 2MB)");
    }

    const hash = createHash("sha256").update(cleanContent).digest("hex");

    // Dedup por hash, pero ignora "orphans" (docs sin chunks de ingestas previas
    // que fallaron a mitad de camino). Si encontramos un orphan con el mismo hash,
    // lo borramos y dejamos que la ingesta nueva lo recree limpio.
    const existing = await this.prisma.knowledgeDoc.findUnique({
      where: { hash },
      include: { _count: { select: { chunks: true } } },
    });
    if (existing && existing._count.chunks > 0) {
      return {
        docId: existing.id,
        chunks: 0,
        skipped: true,
        reason: "hash-exists",
      };
    }
    if (existing) {
      this.logger.warn(
        `Orphan doc detected (id=${existing.id}, "${existing.title}") — deleting and re-ingesting`,
      );
      await this.prisma.knowledgeDoc.delete({ where: { id: existing.id } });
    }

    // Versioning: archivar docs previos con mismo source
    await this.prisma.knowledgeDoc.updateMany({
      where: { source: input.source, status: "active" },
      data: { status: "archived", archivedAt: new Date() },
    });

    const prevVersion = await this.prisma.knowledgeDoc.findFirst({
      where: { source: input.source },
      orderBy: { version: "desc" },
    });
    const version = (prevVersion?.version ?? 0) + 1;

    const rawChunks = chunkText(cleanContent, {
      chunkSize: this.cfg.chunkSize,
      chunkOverlap: this.cfg.chunkOverlap,
    });
    const tokensTotal = rawChunks.reduce((s, c) => s + estimateTokens(c), 0);

    // Doc + chunks en una sola operacion atomica (nested write).
    // Antes lo haciamos en dos pasos (create doc + $transaction chunks) y a veces
    // tiraba "Foreign key constraint violated" en SQLite porque la transaccion
    // de los chunks no veia el doc recien creado.
    const doc = await this.prisma.knowledgeDoc.create({
      data: {
        title: input.title,
        source: input.source,
        category: input.category,
        hash,
        version,
        tokensTotal,
        chunks: {
          create: rawChunks.map((c, i) => ({
            ord: i,
            content: c,
            contentClean: sanitizeChunk(c),
            tokens: estimateTokens(c),
            category: input.category,
            embModel: this.emb.model,
          })),
        },
      },
      include: {
        chunks: { orderBy: { ord: "asc" } },
      },
    });
    const chunkRows = doc.chunks;

    // Embed en batches + insert vectorial
    for (let i = 0; i < chunkRows.length; i += this.cfg.embedBatchSize) {
      const batch = chunkRows.slice(i, i + this.cfg.embedBatchSize);
      const embeddings = await this.emb.embed(batch.map((c) => c.contentClean));
      await Promise.all(
        batch.map((c, j) =>
          this.vec.upsertChunk({
            id: c.id,
            category: c.category,
            content: c.contentClean,
            embedding: embeddings[j],
          }),
        ),
      );
    }

    this.logger.log(
      `ingested doc=${doc.id} "${input.title}" chunks=${chunkRows.length} tokens=${tokensTotal}`,
    );
    this.retrieval.invalidateCache();
    return { docId: doc.id, chunks: chunkRows.length };
  }

  async deleteDoc(docId: number): Promise<void> {
    const doc = await this.prisma.knowledgeDoc.findUnique({
      where: { id: docId },
      include: { chunks: { select: { id: true } } },
    });
    if (!doc) throw new BadRequestException("Doc not found");
    await this.vec.deleteByChunkIds(doc.chunks.map((c) => c.id));
    // Cascade en Prisma borra los chunks asociados al eliminar el doc.
    await this.prisma.knowledgeDoc.delete({ where: { id: docId } });
    this.retrieval.invalidateCache();
    this.logger.log(`deleted doc=${docId} chunks=${doc.chunks.length}`);
  }

  async listDocs() {
    return this.prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
  }

  async getDoc(id: number) {
    return this.prisma.knowledgeDoc.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { ord: "asc" },
          select: {
            id: true,
            ord: true,
            content: true,
            tokens: true,
            category: true,
            embModel: true,
          },
        },
      },
    });
  }

  /**
   * Rebuilds the vector+FTS index from existing chunks in DB.
   * Útil si cambió el modelo de embedding o el índice se corrompió.
   * Tira abajo las tablas FTS5/vec0 y las repuebla desde KnowledgeChunk
   * (Prisma es la fuente de verdad). Esto resuelve corrupciones de FTS5
   * que impiden DELETE/INSERT en upserts normales.
   */
  /**
   * Al arrancar: si kb_vectors está vacío pero hay chunks activos en la DB,
   * repuebla automáticamente sin borrar datos (no llama recreateIndices).
   * Evita que cada restart requiera un rebuild manual.
   */
  async onModuleInit() {
    try {
      const vecRows = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM kb_vectors
      `;
      const vecCount = Number(vecRows[0]?.count ?? 0);

      const chunks = await this.prisma.knowledgeChunk.findMany({
        where: { doc: { status: "active" } },
      });
      if (chunks.length === 0) return;

      // Detectar chunks sin vector en kb_vectors
      const indexed = await this.prisma.$queryRaw<{ chunk_id: number }[]>`
        SELECT chunk_id FROM kb_vectors
      `;
      const indexedIds = new Set(indexed.map((r) => r.chunk_id));
      const missing = chunks.filter((c) => !indexedIds.has(c.id));

      if (missing.length === 0) return;

      this.logger.warn(
        `${missing.length} chunks sin vector (vecCount=${vecCount}) — rellenando al arrancar`,
      );
      this.fillMissingVectors(missing).catch((e: Error) =>
        this.logger.error(`Fill-missing falló: ${e.message}`),
      );
    } catch {
      // La tabla puede no existir aún en el primer arranque
    }
  }

  private async fillMissingVectors(
    chunks: { id: number; category: string; contentClean: string }[],
  ): Promise<void> {
    const currentModel = this.emb.model;
    let done = 0;
    for (let i = 0; i < chunks.length; i += this.cfg.embedBatchSize) {
      const batch = chunks.slice(i, i + this.cfg.embedBatchSize);
      const emb = await this.emb.embed(batch.map((c) => c.contentClean));
      await Promise.all(
        batch.map((c, j) =>
          this.vec.upsertChunk({
            id: c.id,
            category: c.category,
            content: c.contentClean,
            embedding: emb[j],
          }),
        ),
      );
      await this.prisma.knowledgeChunk.updateMany({
        where: { id: { in: batch.map((c) => c.id) } },
        data: { embModel: currentModel },
      });
      done += batch.length;
    }
    this.retrieval.invalidateCache();
    this.logger.log(`fill-missing completado: ${done} vectores insertados`);
  }

  async rebuildIndex(): Promise<{ rebuilt: number }> {
    await this.vec.recreateIndices();
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { doc: { status: "active" } },
    });
    let done = 0;
    const currentModel = this.emb.model;
    for (let i = 0; i < chunks.length; i += this.cfg.embedBatchSize) {
      const batch = chunks.slice(i, i + this.cfg.embedBatchSize);
      const emb = await this.emb.embed(batch.map((c) => c.contentClean));
      await Promise.all(
        batch.map((c, j) =>
          this.vec.upsertChunk({
            id: c.id,
            category: c.category,
            content: c.contentClean,
            embedding: emb[j],
          }),
        ),
      );
      await this.prisma.knowledgeChunk.updateMany({
        where: { id: { in: batch.map((c) => c.id) } },
        data: { embModel: currentModel },
      });
      done += batch.length;
    }
    this.retrieval.invalidateCache();
    this.logger.log(`rebuilt index with ${done} chunks (model=${currentModel})`);
    return { rebuilt: done };
  }
}
