import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from '../config/ai.config';
import { MultiTierCacheService } from '../cache/multi-tier-cache.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { QueryUnderstanding } from '../query-understanding/query-understanding.service';
import { RrfFusion, ScoredCandidate } from '../ranking/rrf-fusion';
import { DomainInferenceService } from './domain-inference.service';
import { FtsSearchRepository } from './fts-search.repository';
import { VectorSearchRepository } from './vector-search.repository';

export interface RetrievedChunk {
  chunkId: number;
  content: string;
  docId: number;
  docTitle: string;
  docSource: string;
  rrfScore: number;
  vectorScore: number | null;
  ftsScore: number | null;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  diagnostics: {
    topDomainSim: number;
    corpusSim: number;
    topVectorScore: number;
    topFtsScore: number;
    expansions: number;
  };
}

@Injectable()
export class RetrievalService {
  private readonly log = new Logger(RetrievalService.name);

  constructor(
    private readonly cfg: AiConfig,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorRepo: VectorSearchRepository,
    private readonly ftsRepo: FtsSearchRepository,
    private readonly domainSvc: DomainInferenceService,
    private readonly cache: MultiTierCacheService,
  ) {}

  async retrieve(understanding: QueryUnderstanding): Promise<RetrievalResult> {
    const cacheKey = this.cache.retrievalKey(understanding.normalizedQuery, [
      ...understanding.expansions,
    ]);
    const cached = this.cache.getRetrieval<RetrievalResult>(cacheKey);
    if (cached) return cached;

    const queries = this.gatherQueries(understanding);
    const [queryEmbeddings] = await Promise.all([
      this.embeddings.embedMany(queries, 'query'),
      this.domainSvc.ensureReady(),
    ]);

    const primary = queryEmbeddings[0];
    const domain = this.domainSvc.analyze(primary);

    const topK = this.cfg.retrievalTopK;
    const vectorRuns: ScoredCandidate[][] = [];
    for (const vec of queryEmbeddings) {
      const hits = await this.vectorRepo.search(vec, topK);
      vectorRuns.push(
        hits.map((h) => ({ id: h.chunkId, rank: h.rank, score: h.score })),
      );
    }

    const ftsRun: ScoredCandidate[] = (
      await this.ftsRepo.search(understanding.ftsTerms, topK)
    ).map((h) => ({ id: h.chunkId, rank: h.rank, score: h.score }));

    const fused = RrfFusion.fuse([...vectorRuns, ftsRun], topK);

    const vectorScoreByChunk = new Map<number, number>();
    for (const run of vectorRuns) {
      for (const h of run) {
        const prev = vectorScoreByChunk.get(h.id) ?? 0;
        if (h.score > prev) vectorScoreByChunk.set(h.id, h.score);
      }
    }
    const ftsScoreByChunk = new Map<number, number>();
    for (const h of ftsRun) ftsScoreByChunk.set(h.id, h.score);

    const chunkIds = fused.map((c) => c.id);
    const rows = chunkIds.length
      ? await this.prisma.knowledgeChunk.findMany({
          where: { id: { in: chunkIds } },
          include: { doc: { select: { id: true, title: true, source: true } } },
        })
      : [];

    const rowById = new Map(rows.map((r) => [r.id, r]));
    const chunks: RetrievedChunk[] = fused
      .map((f) => {
        const row = rowById.get(f.id);
        if (!row) return null;
        return {
          chunkId: row.id,
          content: row.content,
          docId: row.docId,
          docTitle: row.doc.title,
          docSource: row.doc.source,
          rrfScore: f.score,
          vectorScore: vectorScoreByChunk.get(row.id) ?? null,
          ftsScore: ftsScoreByChunk.get(row.id) ?? null,
        };
      })
      .filter((x): x is RetrievedChunk => x !== null);

    const result: RetrievalResult = {
      chunks,
      diagnostics: {
        topDomainSim: domain.topDomainSim,
        corpusSim: domain.corpusSim,
        topVectorScore: Math.max(0, ...vectorScoreByChunk.values()),
        topFtsScore: Math.max(0, ...ftsScoreByChunk.values()),
        expansions: queryEmbeddings.length,
      },
    };
    this.cache.setRetrieval(cacheKey, result);
    return result;
  }

  private gatherQueries(u: QueryUnderstanding): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (s: string | undefined) => {
      if (!s) return;
      const key = s.trim().toLowerCase();
      if (key.length < 2 || seen.has(key)) return;
      seen.add(key);
      out.push(s.trim());
    };
    push(u.normalizedQuery);
    for (const e of u.expansions) push(e);
    if (u.hypotheticalAnswer) push(u.hypotheticalAnswer);
    return out.slice(0, this.cfg.retrievalExpansions + 1);
  }
}
