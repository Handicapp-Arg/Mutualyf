import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RetrievedChunk } from '../retrieval/retrieval.service';
import { cosine, Vec } from '../shared/vector-math';

export interface RerankedChunk extends RetrievedChunk {
  finalScore: number;
  querySim: number;
  hydeSim: number;
}

export interface RerankInput {
  query: string;
  hypotheticalAnswer: string;
  chunks: RetrievedChunk[];
  limit: number;
}

/**
 * Cross-encoder-like reranker using dual-encoder embeddings. We compute a
 * convex combination of three signals per candidate:
 *   - cosine(query, chunk)             direct query match
 *   - cosine(hydeAnswer, chunk)        HyDE — better for vocabulary mismatch
 *   - normalized RRF position          lexical + multi-query prior
 * Weights are fixed and symmetric; no dataset-specific tuning required.
 */
@Injectable()
export class SemanticRerankerService {
  private static readonly W_QUERY = 0.4;
  private static readonly W_HYDE = 0.45;
  private static readonly W_PRIOR = 0.15;

  constructor(private readonly embeddings: EmbeddingsService) {}

  async rerank({
    query,
    hypotheticalAnswer,
    chunks,
    limit,
  }: RerankInput): Promise<RerankedChunk[]> {
    if (chunks.length === 0) return [];

    const embedBodies = chunks.map((c) => c.content);
    const hydeText = hypotheticalAnswer.trim();

    const [queryVec, hydeVec, chunkVecs] = await Promise.all([
      this.embeddings.embed(query, 'query'),
      hydeText
        ? this.embeddings.embed(hydeText, 'query')
        : Promise.resolve<Vec>(new Float32Array()),
      this.embeddings.embedMany(embedBodies, 'doc'),
    ]);

    const maxRrf = Math.max(...chunks.map((c) => c.rrfScore), 1e-6);

    const out: RerankedChunk[] = chunks.map((c, i) => {
      const cv = chunkVecs[i];
      const qs = cosine(queryVec, cv);
      const hs = hydeVec.length ? cosine(hydeVec, cv) : qs;
      const prior = c.rrfScore / maxRrf;
      const finalScore =
        SemanticRerankerService.W_QUERY * qs +
        SemanticRerankerService.W_HYDE * hs +
        SemanticRerankerService.W_PRIOR * prior;
      return { ...c, finalScore, querySim: qs, hydeSim: hs };
    });

    out.sort((a, b) => b.finalScore - a.finalScore);
    return out.slice(0, limit);
  }
}
