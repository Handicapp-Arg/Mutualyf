import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalize } from '../shared/text';

export interface FtsHit {
  chunkId: number;
  score: number;
  rank: number;
}

@Injectable()
export class FtsSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a websearch-style query from user-provided terms. We rely on
   * Postgres's websearch_to_tsquery, which handles quoted phrases, negation
   * and OR without requiring hardcoded stopword lists or plural expansion.
   */
  async search(terms: string[], k: number): Promise<FtsHit[]> {
    const cleaned = terms
      .map((t) => normalize(t))
      .filter((t) => t.length > 1)
      .slice(0, 12);
    if (cleaned.length === 0) return [];

    const tsquery = cleaned.join(' OR ');
    const limit = Math.max(1, k);

    const sql = `
      SELECT
        kv.chunk_id AS "chunkId",
        ts_rank_cd(to_tsvector('simple', kv.content), query) AS score
      FROM kb_vectors kv,
           websearch_to_tsquery('simple', $1) AS query
      WHERE to_tsvector('simple', kv.content) @@ query
      ORDER BY score DESC
      LIMIT $2
    `;
    const rows = await this.prisma.$queryRawUnsafe<
      { chunkId: number; score: number }[]
    >(sql, tsquery, limit);

    return rows.map((r, i) => ({
      chunkId: Number(r.chunkId),
      score: Number(r.score),
      rank: i + 1,
    }));
  }
}
