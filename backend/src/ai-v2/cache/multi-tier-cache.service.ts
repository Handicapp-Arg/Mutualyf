import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from '../config/ai.config';
import { LruCache } from './lru-cache';
import { fromBuffer, toBuffer, Vec } from '../shared/vector-math';
import { normalize } from '../shared/text';

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

@Injectable()
export class MultiTierCacheService {
  private readonly embedL1: LruCache<string, Vec>;
  private readonly retrievalL1: LruCache<string, unknown>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: AiConfig,
  ) {
    this.embedL1 = new LruCache<string, Vec>(
      cfg.embedCacheSize,
      cfg.embedCacheTtlMs,
    );
    this.retrievalL1 = new LruCache<string, unknown>(
      cfg.retrievalCacheSize,
      cfg.retrievalCacheTtlMs,
    );
  }

  embedKey(model: string, kind: 'doc' | 'query', text: string): string {
    return sha1(`${model}::${kind}::${normalize(text)}`);
  }

  async getEmbedding(key: string): Promise<Vec | null> {
    const l1 = this.embedL1.get(key);
    if (l1) return l1;

    const row = await this.prisma.queryCache.findUnique({
      where: { queryHash: key },
    });
    if (!row) return null;

    await this.prisma.queryCache.update({
      where: { queryHash: key },
      data: { hitCount: { increment: 1 } },
    });
    const vec = fromBuffer(row.embedding);
    this.embedL1.set(key, vec);
    return vec;
  }

  async saveEmbedding(key: string, vec: Vec): Promise<void> {
    this.embedL1.set(key, vec);
    await this.prisma.queryCache
      .upsert({
        where: { queryHash: key },
        update: { hitCount: { increment: 1 } },
        create: { queryHash: key, embedding: toBuffer(vec) },
      })
      .catch(() => undefined);
  }

  retrievalKey(query: string, contextHashes: string[]): string {
    return sha1(`${normalize(query)}::${contextHashes.join('|')}`);
  }

  getRetrieval<T>(key: string): T | null {
    return (this.retrievalL1.get(key) as T) ?? null;
  }

  setRetrieval<T>(key: string, value: T): void {
    this.retrievalL1.set(key, value);
  }

  invalidateRetrieval(): void {
    this.retrievalL1.clear();
  }
}
