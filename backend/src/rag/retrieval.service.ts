import { Injectable, Logger } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingsService } from "./embeddings.service";
import { VectorStoreService } from "./vector-store.service";
import { RouterService } from "./router.service";
import { QueryRewriterService } from "./query-rewriter.service";
import { RagMetrics } from "./rag.metrics";
import { RagConfig } from "./rag.config";
import {
  ChatMsg,
  Hit,
  HydratedChunk,
  Intent,
  RetrievalResult,
} from "./rag.types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly resultCache: LRUCache<string, RetrievalResult>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emb: EmbeddingsService,
    private readonly vec: VectorStoreService,
    private readonly router: RouterService,
    private readonly rewriter: QueryRewriterService,
    private readonly metrics: RagMetrics,
    private readonly cfg: RagConfig,
  ) {
    this.resultCache = new LRUCache<string, RetrievalResult>({
      max: CACHE_MAX,
      ttl: CACHE_TTL_MS,
    });
  }

  async search(opts: {
    query: string;
    history: ChatMsg[];
    sessionId?: string;
  }): Promise<RetrievalResult> {
    const t0 = Date.now();

    // Cache key incluye query + últimos 2 turnos del history (suficiente para
    // distinguir follow-ups). sessionId NO entra: la KB es compartida.
    const cacheKey = this.cacheKeyOf(opts.query, opts.history);
    const cached = this.resultCache.get(cacheKey);
    if (cached) {
      this.metrics.retrieval({
        sessionId: opts.sessionId,
        query: opts.query,
        rewritten: cached.rewritten,
        category: cached.intent.category ?? null,
        topK: cached.k,
        topScore: cached.topScore,
        chunkIds: cached.chunks.map((c) => c.id),
        latencyMs: Date.now() - t0,
        intent: `${cached.intent.kind}+cache`,
      });
      return { ...cached, latencyMs: Date.now() - t0 };
    }

    const rewritten = await this.rewriter.rewrite(opts.history, opts.query);

    // Clasificar sobre la query reescrita (tiene el contexto del history).
    // Si el rewriter expandió "y eso?" → "horario de atención y eso", el clasificador
    // ahora ve la categoría correcta.
    const intent = this.router.classify(rewritten);

    if (intent.kind === "chitchat") {
      const res: RetrievalResult = {
        chunks: [],
        topScore: 0,
        intent,
        rewritten,
        latencyMs: Date.now() - t0,
        k: 0,
      };
      this.metrics.retrieval({
        sessionId: opts.sessionId,
        query: opts.query,
        rewritten,
        category: null,
        topK: 0,
        topScore: 0,
        chunkIds: [],
        latencyMs: res.latencyMs,
        intent: "chitchat",
      });
      this.resultCache.set(cacheKey, res);
      return res;
    }

    const k = this.router.dynamicK(rewritten);
    const category = intent.categoryConfident ? intent.category : undefined;

    // Vector path es best-effort: si embeddings fallan, seguimos con FTS puro.
    const ftsHits = this.vec.fts({ query: rewritten, k: k * 3, category });
    let vecHits: Hit[] = [];
    let embeddingsAvailable = true;
    let topVecScore = 0;
    try {
      const [qEmb] = await this.emb.embed([rewritten], "query");
      vecHits = this.vec.knn({ embedding: qEmb, k: k * 3, category });
      topVecScore = vecHits[0]?.score ?? 0;
    } catch (e) {
      embeddingsAvailable = false;
      this.logger.warn(
        `embed failed, falling back to FTS-only: ${(e as Error).message}`,
      );
    }

    const fused = rrfFuse(vecHits, ftsHits, this.cfg.rrfK).slice(0, k);
    const topScore = fused[0]?.score ?? 0;

    // Guard off-topic: SOLO cuando tenemos vector search confiable.
    // Compara contra topVecScore (raw cosine ~ 1/(1+L2_dist)), no RRF.
    // RRF score ~0.03 no es comparable con un threshold tipo similarity (~0.45).
    // - embeddings caídos → no podemos decidir.
    // - query muy corta → ambigua por naturaleza.
    // - hay history → confiamos en el LLM para interpretarlo.
    const words = rewritten.trim().split(/\s+/).length;
    const hasHistory = opts.history.length > 0;
    const canDetectOfftopic =
      this.cfg.enableOfftopicGuard &&
      embeddingsAvailable &&
      words >= this.cfg.minWordsForOfftopic &&
      !hasHistory;

    if (
      canDetectOfftopic &&
      (!fused.length || topVecScore < this.cfg.offtopicThreshold)
    ) {
      const res: RetrievalResult = {
        chunks: [],
        topScore,
        intent: { kind: "offtopic", categoryConfident: false },
        rewritten,
        latencyMs: Date.now() - t0,
        k,
      };
      this.metrics.retrieval({
        sessionId: opts.sessionId,
        query: opts.query,
        rewritten,
        category: intent.category ?? null,
        topK: k,
        topScore: topVecScore,
        chunkIds: [],
        latencyMs: res.latencyMs,
        intent: "offtopic",
      });
      this.resultCache.set(cacheKey, res);
      return res;
    }

    // Sin chunks pero no off-topic → degradamos a "rag sin contexto" preservando categoría.
    if (!fused.length) {
      const noCtxIntent: Intent = {
        kind: "rag",
        category: intent.category,
        categoryConfident: intent.categoryConfident,
      };
      const res: RetrievalResult = {
        chunks: [],
        topScore: 0,
        intent: noCtxIntent,
        rewritten,
        latencyMs: Date.now() - t0,
        k,
      };
      this.metrics.retrieval({
        sessionId: opts.sessionId,
        query: opts.query,
        rewritten,
        category: intent.category ?? null,
        topK: k,
        topScore: 0,
        chunkIds: [],
        latencyMs: res.latencyMs,
        intent: "no-context",
      });
      this.resultCache.set(cacheKey, res);
      return res;
    }

    const chunks = await this.hydrate(fused, category);
    const res: RetrievalResult = {
      chunks,
      topScore,
      intent,
      rewritten,
      latencyMs: Date.now() - t0,
      k,
    };
    this.metrics.retrieval({
      sessionId: opts.sessionId,
      query: opts.query,
      rewritten,
      category: intent.category ?? null,
      topK: k,
      topScore,
      chunkIds: chunks.map((c) => c.id),
      latencyMs: res.latencyMs,
      intent: "rag",
    });
    this.resultCache.set(cacheKey, res);
    return res;
  }

  /**
   * Invalida el cache. Llamar tras ingest/archive de docs para evitar
   * servir resultados stale.
   */
  invalidateCache(): void {
    this.resultCache.clear();
  }

  private cacheKeyOf(query: string, history: ChatMsg[]): string {
    const tail = history
      .slice(-2)
      .map((m) => `${m.role}:${m.content.slice(0, 200)}`)
      .join("|");
    return createHash("sha1")
      .update(`${query.trim().toLowerCase()}::${tail}`)
      .digest("hex");
  }

  private async hydrate(hits: Hit[], category?: string): Promise<HydratedChunk[]> {
    if (!hits.length) return [];
    const ids = hits.map((h) => h.chunkId);
    const rows = await this.prisma.knowledgeChunk.findMany({
      where: { id: { in: ids }, ...(category ? { category } : {}) },
      include: { doc: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const out: HydratedChunk[] = [];
    for (const h of hits) {
      const r = byId.get(h.chunkId);
      if (!r || r.doc.status !== "active") continue;
      out.push({
        id: r.id,
        content: r.content,
        contentClean: r.contentClean,
        category: r.category,
        source: r.doc.source,
        docTitle: r.doc.title,
        tokens: r.tokens,
      });
    }
    return out;
  }
}

function rrfFuse(a: Hit[], b: Hit[], k: number): Hit[] {
  const scores = new Map<number, number>();
  a.forEach((h, i) =>
    scores.set(h.chunkId, (scores.get(h.chunkId) ?? 0) + 1 / (k + i + 1)),
  );
  b.forEach((h, i) =>
    scores.set(h.chunkId, (scores.get(h.chunkId) ?? 0) + 1 / (k + i + 1)),
  );
  return [...scores.entries()]
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((x, y) => y.score - x.score);
}
