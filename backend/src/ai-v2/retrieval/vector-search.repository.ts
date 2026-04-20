import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPgvector, Vec } from '../shared/vector-math';

export interface VectorHit {
  chunkId: number;
  score: number;
  rank: number;
}

@Injectable()
export class VectorSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    queryVec: Vec,
    k: number,
    categoryHint?: string | null,
  ): Promise<VectorHit[]> {
    const vectorLiteral = toPgvector(queryVec);
    const limit = Math.max(1, k);

    const where = categoryHint
      ? `WHERE kv.category = $2`
      : `WHERE TRUE`;
    const params: unknown[] = [vectorLiteral];
    if (categoryHint) params.push(categoryHint);
    params.push(limit);

    const sql = `
      SELECT
        kv.chunk_id AS "chunkId",
        1 - (kv.embedding <=> $1::vector) AS score
      FROM kb_vectors kv
      ${where}
      ORDER BY kv.embedding <=> $1::vector
      LIMIT $${params.length}
    `;

    const rows = await this.prisma.$queryRawUnsafe<
      { chunkId: number; score: number }[]
    >(sql, ...params);

    return rows.map((r, i) => ({
      chunkId: Number(r.chunkId),
      score: Number(r.score),
      rank: i + 1,
    }));
  }
}
