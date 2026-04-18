import { Injectable, Logger } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeText } from "./text-utils";
import { EmbeddingsService } from "./embeddings.service";
import { VectorStoreService } from "./vector-store.service";
import { RouterService } from "./router.service";
import { QueryRewriterService } from "./query-rewriter.service";
import { RagMetrics, OfftopicDebug } from "./rag.metrics";
import { RagConfig } from "./rag.config";
import {
  OfftopicDetectorService,
  OfftopicSignals,
  computeOverlapRatio,
  computeConcentration,
} from "./offtopic-detector.service";
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
    private readonly offtopicDetector: OfftopicDetectorService,
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
    let ftsHits = await this.vec.ftsAsync({ query: rewritten, k: k * 3, category });
    let vecHits: Hit[] = [];
    let embeddingsAvailable = true;
    try {
      const [qEmb] = await this.emb.embed([rewritten], "query");
      vecHits = await this.vec.knnAsync({ embedding: qEmb, k: k * 3, category });
    } catch (e) {
      embeddingsAvailable = false;
      this.logger.warn(
        `embed failed, falling back to FTS-only: ${(e as Error).message}`,
      );
    }

    // Fallback sin categoría: si el filtro por categoría no devuelve nada,
    // reintentamos sin filtro para no perder docs ingresados con otra categoría.
    if (!ftsHits.length && !vecHits.length && category) {
      this.logger.debug(`category="${category}" sin hits — reintentando sin filtro`);
      ftsHits = await this.vec.ftsAsync({ query: rewritten, k: k * 3 });
      try {
        const [qEmb] = await this.emb.embed([rewritten], "query");
        vecHits = await this.vec.knnAsync({ embedding: qEmb, k: k * 3 });
      } catch { /* ya logueado arriba */ }
    }

    const fused = rrfFuse(vecHits, ftsHits, this.cfg.rrfK).slice(0, k);
    const topScore = fused[0]?.score ?? 0;

    this.logger.debug(
      `retrieval hits — vec=${vecHits.length} fts=${ftsHits.length} fused=${fused.length} topScore=${topScore.toFixed(4)} query="${rewritten.slice(0, 80)}"`,
    );

    const signals: OfftopicSignals = {
      topVecScore: vecHits[0]?.score ?? 0,
      topFtsScore: ftsHits[0]?.score ?? 0,
      fusedHitCount: fused.length,
      vecHitCount: vecHits.length,
      ftsHitCount: ftsHits.length,
      overlapRatio: computeOverlapRatio(
        vecHits,
        ftsHits,
        this.cfg.offtopicOverlapTopN,
      ),
      concentration: computeConcentration(fused, k),
      queryWords: rewritten.trim().split(/\s+/).filter(Boolean).length,
      hasHistory: opts.history.length > 0,
      routerConfident: intent.categoryConfident,
      embeddingsAvailable,
    };
    const decision = this.offtopicDetector.detect(signals);
    const offtopicDebug: OfftopicDebug = {
      confidence: decision.confidence,
      effectiveThreshold: decision.effectiveThreshold,
      reason: decision.reason,
      topVecScore: signals.topVecScore,
      topFtsScore: signals.topFtsScore,
      overlapRatio: signals.overlapRatio,
      concentration: signals.concentration,
      queryWords: signals.queryWords,
      routerConfident: signals.routerConfident,
    };

    if (decision.isOfftopic) {
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
        topScore,
        chunkIds: [],
        latencyMs: res.latencyMs,
        intent: "offtopic",
        offtopic: offtopicDebug,
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
        offtopic: offtopicDebug,
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
      offtopic: offtopicDebug,
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
      .update(`${normalizeText(query)}::${tail}`)
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
