import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LRUCache } from "lru-cache";
import fetch from "node-fetch";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EMBEDDING_DIM } from "./vector-store.service";
import { RagConfig } from "./rag.config";
import { normalizeText } from "./text-utils";

export type EmbedKind = "query" | "document";

// 5s era demasiado poco — Ollama puede tardar más en respuesta fría.
const OLLAMA_TIMEOUT_MS = 15_000;
const GEMINI_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;

/**
 * Embeddings con cache 2-niveles + prefijos task-specific.
 *  - L1: LRU in-process
 *  - L2: SQLite QueryCache (persistente)
 * Provider principal: Ollama (nomic-embed-text, 768d).
 * Fallback: Gemini text-embedding-004.
 *
 * Prefijos: nomic-embed-text v1.5 requiere "search_query: " / "search_document: ".
 * Sin esos prefijos los vectores son all-purpose y degradan retrieval ~10-20% MRR.
 * El cache key incluye el kind para evitar mezclar geometrías.
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly lru: LRUCache<string, Float32Array>;
  private readonly ollamaUrl: string;
  private readonly embedModel: string;
  private readonly modelVersion: string;
  private readonly geminiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ragCfg: RagConfig,
  ) {
    this.ollamaUrl = this.config.get<string>(
      "OLLAMA_URL",
      "http://localhost:11434",
    );
    this.embedModel = this.ragCfg.embedModel;
    // v2: invalida cache previo (los embeddings v1 no usaban prefijos task-specific)
    this.modelVersion = `${this.embedModel}:v2`;
    this.geminiKey = this.config.get<string>("GEMINI_API_KEY", "");
    this.lru = new LRUCache<string, Float32Array>({
      max: this.ragCfg.lruMax,
      ttl: this.ragCfg.lruTtlMs,
    });
  }

  get model(): string {
    return this.modelVersion;
  }

  get rawModelName(): string {
    return this.embedModel;
  }

  get providerUrl(): string {
    return this.ollamaUrl;
  }

  async pullModel(): Promise<{
    ok: boolean;
    status: string;
    durationMs: number;
  }> {
    const t0 = Date.now();
    const res = await fetchWithTimeout(
      `${this.ollamaUrl}/api/pull`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.embedModel, stream: false }),
      },
      30_000,
    );
    const status = res.status;
    const ok = res.ok;
    await res.text().catch(() => "");
    this.logger.log(`pullModel ${this.embedModel} status=${status} ok=${ok}`);
    return { ok, status: String(status), durationMs: Date.now() - t0 };
  }

  /**
   * Preflight: valida provider reachable + dim correcta + alerta si hay
   * chunks indexados con versiones de modelo distintas (rebuild necesario).
   */
  async onModuleInit() {
    try {
      const [v] = await this.callProvider(["preflight"], "document");
      if (v.length !== EMBEDDING_DIM) {
        this.logger.error(
          `Embedding dim mismatch: got ${v.length}, expected ${EMBEDDING_DIM}. ` +
            `RAG retrieval estará roto. Ajustá EMBEDDING_DIM o EMBEDDING_MODEL.`,
        );
      } else {
        this.logger.log(
          `Embeddings OK — model=${this.modelVersion} dim=${v.length}`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `Embeddings preflight failed: ${(e as Error).message}. ` +
          `Verify Ollama is reachable at ${this.ollamaUrl} and model "${this.embedModel}" is pulled ` +
          `(ollama pull ${this.embedModel}).`,
      );
    }

    // Detección de versiones mezcladas: si hay chunks con embModel != modelVersion,
    // el retrieval va a ser subóptimo hasta que se llame /admin/rag/rebuild.
    try {
      const versions = await this.prisma.knowledgeChunk.groupBy({
        by: ["embModel"],
        _count: { _all: true },
      });
      const stale = versions.filter((v) => v.embModel !== this.modelVersion);
      if (stale.length > 0) {
        const detail = stale
          .map((v) => `${v.embModel}=${v._count._all}`)
          .join(", ");
        this.logger.warn(
          `Indexed chunks with stale embed model versions [${detail}]. ` +
            `Run POST /admin/rag/rebuild to re-embed with current ${this.modelVersion}.`,
        );
      }
    } catch {
      // groupBy puede fallar antes de las migraciones — ignorar
    }
  }

  /**
   * Embed con prefijo task-specific. kind='query' para retrieval, 'document' para ingestion.
   * Mismo texto con kind distinto produce vectores distintos (geometrías diferentes).
   */
  async embed(
    texts: string[],
    kind: EmbedKind = "document",
  ): Promise<Float32Array[]> {
    if (!texts.length) return [];
    const keys = texts.map((t) => this.keyOf(t, kind));
    const out: (Float32Array | null)[] = new Array(texts.length).fill(null);
    const missIdx: number[] = [];

    // L1
    keys.forEach((k, i) => {
      const hit = this.lru.get(k);
      if (hit) out[i] = hit;
      else missIdx.push(i);
    });

    // L2
    if (missIdx.length) {
      const rows = await this.prisma.queryCache.findMany({
        where: { queryHash: { in: missIdx.map((i) => keys[i]) } },
      });
      const rowMap = new Map(
        rows.map((r) => [r.queryHash, bufToF32(r.embedding)]),
      );
      const stillMiss: number[] = [];
      const hitIds: number[] = [];
      for (const i of missIdx) {
        const r = rowMap.get(keys[i]);
        if (r) {
          out[i] = r;
          this.lru.set(keys[i], r);
          const dbRow = rows.find((row) => row.queryHash === keys[i]);
          if (dbRow) hitIds.push(dbRow.id);
        } else {
          stillMiss.push(i);
        }
      }

      // Hit count: un solo update batched (sin await — fire-and-forget)
      if (hitIds.length) {
        this.prisma.queryCache
          .updateMany({
            where: { id: { in: hitIds } },
            data: { hitCount: { increment: 1 } },
          })
          .catch((e) =>
            this.logger.debug(`hit count update failed: ${e?.message}`),
          );
      }

      if (stillMiss.length) {
        const provider = await this.callProvider(
          stillMiss.map((i) => texts[i]),
          kind,
        );
        await Promise.all(
          stillMiss.map(async (idx, j) => {
            const v = provider[j];
            out[idx] = v;
            this.lru.set(keys[idx], v);
            this.prisma.queryCache
              .upsert({
                where: { queryHash: keys[idx] },
                create: { queryHash: keys[idx], embedding: f32ToBuf(v) },
                update: { hitCount: { increment: 1 } },
              })
              .catch((e) =>
                this.logger.warn(`cache upsert failed: ${e?.message}`),
              );
          }),
        );
      }
    }

    return out as Float32Array[];
  }

  private keyOf(text: string, kind: EmbedKind): string {
    return createHash("sha1")
      .update(`${this.modelVersion}::${kind}::${normalizeText(text)}`)
      .digest("hex");
  }

  private async callProvider(
    texts: string[],
    kind: EmbedKind,
  ): Promise<Float32Array[]> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.embedOllama(texts, kind);
      } catch (e) {
        lastErr = e as Error;
        if (attempt < MAX_RETRIES - 1) {
          await sleep(200 * 2 ** attempt); // 200, 400, 800
        }
      }
    }
    this.logger.warn(
      `Ollama embed failed (${MAX_RETRIES} attempts): ${lastErr?.message}. Trying Gemini.`,
    );
    if (!this.geminiKey) throw lastErr;
    return await this.embedGemini(texts, kind);
  }

  private async embedOllama(
    texts: string[],
    kind: EmbedKind,
  ): Promise<Float32Array[]> {
    const prefixed = texts.map((t) => withOllamaPrefix(t, kind));
    const res = await fetchWithTimeout(
      `${this.ollamaUrl}/api/embed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.embedModel, input: prefixed }),
      },
      OLLAMA_TIMEOUT_MS,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama embed ${res.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const raw: number[][] =
      data.embeddings || (data.embedding ? [data.embedding] : []);
    if (!raw.length) throw new Error("Ollama embed: no vectors");
    return raw.map((v) => assertDim(Float32Array.from(v)));
  }

  private async embedGemini(
    texts: string[],
    kind: EmbedKind,
  ): Promise<Float32Array[]> {
    const taskType =
      kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";
    // Paralelo: el endpoint embedContent es 1 doc por request, pero podemos hacerlos
    // concurrentes en lugar de seriales para reducir latencia x16.
    return Promise.all(
      texts.map(async (t) => {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: { parts: [{ text: t }] },
              taskType,
            }),
          },
          GEMINI_TIMEOUT_MS,
        );
        if (!res.ok) throw new Error(`Gemini embed ${res.status}`);
        const data: any = await res.json();
        const v: number[] = data?.embedding?.values || [];
        if (!v.length) throw new Error("Gemini embed: empty vector");
        return assertDim(Float32Array.from(v));
      }),
    );
  }
}

function withOllamaPrefix(text: string, kind: EmbedKind): string {
  // Convención de nomic-embed-text v1.5; benigno para otros modelos
  // (si el modelo no la usa, solo agrega ~10 tokens irrelevantes al input).
  const prefix = kind === "query" ? "search_query: " : "search_document: ";
  return prefix + text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Falla fuerte si la dimensión no coincide. Truncar/paddar embeddings
 * destruye su geometría silenciosamente — mejor crash que retrieval roto.
 */
function assertDim(v: Float32Array): Float32Array {
  if (v.length !== EMBEDDING_DIM) {
    throw new Error(
      `Embedding dim mismatch: got ${v.length}, expected ${EMBEDDING_DIM}. ` +
        `Reconfig EMBEDDING_DIM o EMBEDDING_MODEL.`,
    );
  }
  return v;
}

async function fetchWithTimeout(
  url: string,
  init: any,
  timeoutMs: number,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function f32ToBuf(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}
function bufToF32(b: Buffer): Float32Array {
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Float32Array(ab);
}
