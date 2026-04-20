import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import {
  cosine,
  fromBuffer,
  kmeans,
  meanPool,
  Vec,
} from '../shared/vector-math';

interface Domain {
  id: number;
  centroid: Vec;
  label: string;
  chunkCount: number;
}

/**
 * Infers domains by clustering all chunk embeddings. The number of domains is
 * picked adaptively: roughly sqrt(N)/2, bounded [3, 16]. Nothing hardcoded.
 */
@Injectable()
export class DomainInferenceService implements OnModuleInit {
  private readonly log = new Logger(DomainInferenceService.name);
  private domains: Domain[] = [];
  private corpusCentroid: Vec | null = null;
  private rebuildingPromise: Promise<void> | null = null;
  private lastBuiltAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.rebuild().catch((e) =>
      this.log.warn(`initial domain build failed: ${String(e)}`),
    );
  }

  async ensureReady(): Promise<void> {
    if (this.domains.length) return;
    if (!this.rebuildingPromise) this.rebuildingPromise = this.rebuild();
    await this.rebuildingPromise.catch(() => undefined);
  }

  async rebuild(): Promise<void> {
    const rows = await this.prisma.$queryRawUnsafe<
      { chunkId: number; embedding: Buffer }[]
    >(`
      SELECT kv.chunk_id AS "chunkId",
             kv.embedding::text::bytea AS embedding
      FROM kb_vectors kv
      LIMIT 20000
    `).catch(() => []);

    if (!rows?.length) {
      this.domains = [];
      this.corpusCentroid = null;
      return;
    }

    const vectors = rows.map((r) => fromBuffer(r.embedding));
    const k = Math.min(16, Math.max(3, Math.round(Math.sqrt(vectors.length) / 2)));
    const { centroids, assignments } = kmeans(vectors, k);
    this.corpusCentroid = meanPool(vectors);

    const counts = new Array<number>(centroids.length).fill(0);
    for (const a of assignments) counts[a]++;

    this.domains = centroids.map((c, i) => ({
      id: i,
      centroid: c,
      label: `cluster-${i}`,
      chunkCount: counts[i],
    }));

    this.lastBuiltAt = Date.now();
    this.log.log(
      `domains rebuilt: k=${centroids.length} over ${vectors.length} chunks`,
    );
  }

  /** Returns nearest-centroid similarity & corpus centroid similarity. */
  analyze(queryVec: Vec): {
    topDomainSim: number;
    topDomainId: number | null;
    corpusSim: number;
  } {
    if (!this.domains.length || !this.corpusCentroid) {
      return { topDomainSim: 0, topDomainId: null, corpusSim: 0 };
    }
    let best = -Infinity,
      bestId: number | null = null;
    for (const d of this.domains) {
      const s = cosine(queryVec, d.centroid);
      if (s > best) {
        best = s;
        bestId = d.id;
      }
    }
    const corpusSim = cosine(queryVec, this.corpusCentroid);
    return { topDomainSim: best, topDomainId: bestId, corpusSim };
  }

  get ageMs(): number {
    return Date.now() - this.lastBuiltAt;
  }
}
