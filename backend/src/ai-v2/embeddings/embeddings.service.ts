import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiConfig } from '../config/ai.config';
import { MultiTierCacheService } from '../cache/multi-tier-cache.service';
import { Vec } from '../shared/vector-math';
import { EmbedKind, EmbeddingProvider } from './embedding.interface';
import { OllamaEmbeddingProvider } from './providers/ollama.provider';
import { GeminiEmbeddingProvider } from './providers/gemini.provider';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly log = new Logger(EmbeddingsService.name);
  private readonly providers: EmbeddingProvider[];
  private active: EmbeddingProvider;

  constructor(
    private readonly cfg: AiConfig,
    private readonly cache: MultiTierCacheService,
    ollama: OllamaEmbeddingProvider,
    gemini: GeminiEmbeddingProvider,
  ) {
    this.providers = [ollama, gemini];
    this.active = ollama;
  }

  async onModuleInit(): Promise<void> {
    for (const p of this.providers) {
      if (await p.healthy()) {
        this.active = p;
        this.log.log(`active embedding provider: ${p.name} (${p.dims}d)`);
        return;
      }
    }
    this.log.warn('no healthy embedding provider at boot, will retry on demand');
  }

  get dims(): number {
    return this.active.dims;
  }

  get modelId(): string {
    return `${this.active.name}:${this.cfg.embedModel}`;
  }

  async embed(text: string, kind: EmbedKind): Promise<Vec> {
    const [out] = await this.embedMany([text], kind);
    return out;
  }

  async embedMany(texts: string[], kind: EmbedKind): Promise<Vec[]> {
    const out: Vec[] = new Array(texts.length);
    const misses: { idx: number; text: string; key: string }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const key = this.cache.embedKey(this.modelId, kind, texts[i]);
      const hit = await this.cache.getEmbedding(key);
      if (hit) out[i] = hit;
      else misses.push({ idx: i, text: texts[i], key });
    }

    if (misses.length === 0) return out;

    const batched = await this.runWithFallback(
      misses.map((m) => m.text),
      kind,
    );

    await Promise.all(
      misses.map((m, i) => {
        out[m.idx] = batched[i];
        return this.cache.saveEmbedding(m.key, batched[i]);
      }),
    );
    return out;
  }

  private async runWithFallback(
    texts: string[],
    kind: EmbedKind,
  ): Promise<Vec[]> {
    let lastErr: unknown;
    const order = [this.active, ...this.providers.filter((p) => p !== this.active)];
    for (const p of order) {
      try {
        const result = await p.embed(texts, kind);
        if (p !== this.active) {
          this.log.warn(
            `switching active embedding provider: ${this.active.name} → ${p.name}`,
          );
          this.active = p;
        }
        return result;
      } catch (e) {
        lastErr = e;
        this.log.warn(`embedding provider ${p.name} failed: ${String(e)}`);
      }
    }
    throw lastErr ?? new Error('all embedding providers failed');
  }
}
