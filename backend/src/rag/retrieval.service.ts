import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';
import { VectorStoreService } from './vector-store.service';
import { RouterService } from './router.service';
import { QueryRewriterService } from './query-rewriter.service';
import { RagMetrics } from './rag.metrics';
import { RagConfig } from './rag.config';
import { ChatMsg, Hit, HydratedChunk, RetrievalResult } from './rag.types';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emb: EmbeddingsService,
    private readonly vec: VectorStoreService,
    private readonly router: RouterService,
    private readonly rewriter: QueryRewriterService,
    private readonly metrics: RagMetrics,
    private readonly cfg: RagConfig,
  ) {}

  async search(opts: {
    query: string;
    history: ChatMsg[];
    sessionId?: string;
  }): Promise<RetrievalResult> {
    const t0 = Date.now();
    const [rewritten, intent] = await Promise.all([
      this.rewriter.rewrite(opts.history, opts.query),
      Promise.resolve(this.router.classify(opts.query)),
    ]);

    if (intent.kind === 'chitchat') {
      const res: RetrievalResult = { chunks: [], topScore: 0, intent, rewritten, latencyMs: Date.now() - t0, k: 0 };
      this.metrics.retrieval({
        sessionId: opts.sessionId, query: opts.query, rewritten, category: null,
        topK: 0, topScore: 0, chunkIds: [], latencyMs: res.latencyMs, intent: 'chitchat',
      });
      return res;
    }

    const k = this.router.dynamicK(rewritten);
    const category = intent.categoryConfident ? intent.category : undefined;

    // Vector path es best-effort: si embeddings fallan, seguimos con FTS puro.
    const ftsHits = this.vec.fts({ query: rewritten, k: k * 3, category });
    let vecHits: Hit[] = [];
    let embeddingsAvailable = true;
    try {
      const [qEmb] = await this.emb.embed([rewritten]);
      vecHits = this.vec.knn({ embedding: qEmb, k: k * 3, category });
    } catch (e) {
      embeddingsAvailable = false;
      this.logger.warn(`embed failed, falling back to FTS-only: ${(e as Error).message}`);
    }

    const fused = rrfFuse(vecHits, ftsHits, this.cfg.rrfK).slice(0, k);
    const topScore = fused[0]?.score ?? 0;

    // Guard off-topic: SOLO cuando tenemos vector search confiable.
    // - Si embeddings fallan → no podemos decidir.
    // - Si la query es muy corta → ambigua por naturaleza.
    // - Si hay historial → es un follow-up, confiamos en el LLM para interpretarlo.
    const words = rewritten.trim().split(/\s+/).length;
    const hasHistory = opts.history.length > 0;
    const canDetectOfftopic =
      this.cfg.enableOfftopicGuard &&
      embeddingsAvailable &&
      words >= this.cfg.minWordsForOfftopic &&
      !hasHistory;

    if (canDetectOfftopic && (!fused.length || topScore < this.cfg.offtopicThreshold)) {
      const res: RetrievalResult = {
        chunks: [], topScore, intent: { kind: 'offtopic', categoryConfident: false },
        rewritten, latencyMs: Date.now() - t0, k,
      };
      this.metrics.retrieval({
        sessionId: opts.sessionId, query: opts.query, rewritten,
        category: intent.category ?? null, topK: k, topScore,
        chunkIds: [], latencyMs: res.latencyMs, intent: 'offtopic',
      });
      return res;
    }

    // Si no hay chunks pero no marcamos off-topic → degradamos a "rag sin contexto":
    // el RagService usará el base prompt y el LLM responderá amablemente o derivará al 0800.
    if (!fused.length) {
      const res: RetrievalResult = {
        chunks: [], topScore: 0, intent: { kind: 'chitchat', categoryConfident: false },
        rewritten, latencyMs: Date.now() - t0, k,
      };
      this.metrics.retrieval({
        sessionId: opts.sessionId, query: opts.query, rewritten,
        category: intent.category ?? null, topK: k, topScore: 0,
        chunkIds: [], latencyMs: res.latencyMs, intent: 'no-context',
      });
      return res;
    }

    const chunks = await this.hydrate(fused);
    const res: RetrievalResult = { chunks, topScore, intent, rewritten, latencyMs: Date.now() - t0, k };
    this.metrics.retrieval({
      sessionId: opts.sessionId, query: opts.query, rewritten,
      category: intent.category ?? null, topK: k, topScore,
      chunkIds: chunks.map(c => c.id), latencyMs: res.latencyMs, intent: 'rag',
    });
    return res;
  }

  private async hydrate(hits: Hit[]): Promise<HydratedChunk[]> {
    if (!hits.length) return [];
    const ids = hits.map(h => h.chunkId);
    const rows = await this.prisma.knowledgeChunk.findMany({
      where: { id: { in: ids } },
      include: { doc: true },
    });
    const byId = new Map(rows.map(r => [r.id, r]));
    const out: HydratedChunk[] = [];
    for (const h of hits) {
      const r = byId.get(h.chunkId);
      if (!r || r.doc.status !== 'active') continue;
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
  a.forEach((h, i) => scores.set(h.chunkId, (scores.get(h.chunkId) ?? 0) + 1 / (k + i + 1)));
  b.forEach((h, i) => scores.set(h.chunkId, (scores.get(h.chunkId) ?? 0) + 1 / (k + i + 1)));
  return [...scores.entries()]
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((x, y) => y.score - x.score);
}
