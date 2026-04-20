import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { cosine, percentile } from '../shared/vector-math';
import { estimateTokens, splitIntoSentences } from '../shared/text';

export interface ChunkOptions {
  minTokens?: number;
  maxTokens?: number;
  overlapSentences?: number;
  breakpointPercentile?: number;
}

export interface SemanticChunk {
  ord: number;
  content: string;
  tokens: number;
}

@Injectable()
export class SemanticChunkerService {
  constructor(private readonly embeddings: EmbeddingsService) {}

  async chunk(text: string, opts: ChunkOptions = {}): Promise<SemanticChunk[]> {
    const minTokens = opts.minTokens ?? 120;
    const maxTokens = opts.maxTokens ?? 600;
    const overlap = opts.overlapSentences ?? 1;
    const breakPct = opts.breakpointPercentile ?? 80;

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return [];
    if (sentences.length === 1) {
      return [
        { ord: 0, content: sentences[0], tokens: estimateTokens(sentences[0]) },
      ];
    }

    const embs = await this.embeddings.embedMany(sentences, 'doc');

    // distance between consecutive sentence embeddings
    const distances: number[] = [];
    for (let i = 0; i < embs.length - 1; i++) {
      distances.push(1 - cosine(embs[i], embs[i + 1]));
    }
    const threshold = percentile(distances, breakPct);

    const rawBoundaries: number[] = [];
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] >= threshold) rawBoundaries.push(i + 1);
    }

    const chunks: SemanticChunk[] = [];
    let start = 0;
    const flush = (end: number) => {
      const slice = sentences.slice(Math.max(0, start - overlap), end);
      const content = slice.join(' ').trim();
      if (!content) return;
      chunks.push({
        ord: chunks.length,
        content,
        tokens: estimateTokens(content),
      });
      start = end;
    };

    const boundarySet = new Set(rawBoundaries);
    let tokenAcc = 0;
    for (let i = 0; i < sentences.length; i++) {
      tokenAcc += estimateTokens(sentences[i]);
      const atBoundary = boundarySet.has(i + 1);
      const over = tokenAcc >= maxTokens;
      const enoughForBoundary = tokenAcc >= minTokens;
      if ((atBoundary && enoughForBoundary) || over) {
        flush(i + 1);
        tokenAcc = 0;
      }
    }
    if (start < sentences.length) flush(sentences.length);
    return chunks;
  }
}
