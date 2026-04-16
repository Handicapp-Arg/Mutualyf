import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LRUCache } from 'lru-cache';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EMBEDDING_DIM } from './vector-store.service';
import { RagConfig } from './rag.config';

/**
 * Embeddings con cache 2-niveles:
 *  - L1: LRU in-process (2000 entries, TTL 1h)
 *  - L2: SQLite QueryCache (persistente)
 * Provider principal: Ollama (nomic-embed-text, 768d).
 * Fallback: Gemini text-embedding-004.
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly lru: LRUCache<string, Float32Array>;
  private readonly ollamaUrl: string;
  private readonly embedModel: string;
  private readonly modelVersion: string;
  private readonly geminiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ragCfg: RagConfig,
  ) {
    this.ollamaUrl = this.config.get<string>('OLLAMA_URL', 'http://localhost:11434');
    this.embedModel = this.ragCfg.embedModel;
    this.modelVersion = `${this.embedModel}:v1`;
    this.geminiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.lru = new LRUCache<string, Float32Array>({
      max: this.ragCfg.lruMax,
      ttl: this.ragCfg.lruTtlMs,
    });
  }

  get model(): string {
    return this.modelVersion;
  }

  get rawModelName(): string {
    return this.embedModel;
  }

  get providerUrl(): string {
    return this.ollamaUrl;
  }

  /**
   * Dispara un pull del modelo en el Ollama remoto.
   * Útil cuando el health check detectó que no está presente.
   */
  async pullModel(): Promise<{ ok: boolean; status: string; durationMs: number }> {
    const t0 = Date.now();
    const res = await fetch(`${this.ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, stream: false }),
    });
    const status = res.status;
    const ok = res.ok;
    // consumir body para evitar leaks
    await res.text().catch(() => '');
    this.logger.log(`pullModel ${this.embedModel} status=${status} ok=${ok}`);
    return { ok, status: String(status), durationMs: Date.now() - t0 };
  }

  /**
   * Preflight: valida que el provider esté reachable y que la dimensión
   * coincida con EMBEDDING_DIM. Si falla, loggea y deja seguir (el ingest
   * y retrieval van a fallar graceful). No throw: evita que el proceso muera.
   */
  async onModuleInit() {
    try {
      const [v] = await this.callProvider(['preflight']);
      if (v.length !== EMBEDDING_DIM) {
        this.logger.warn(
          `Embedding dim mismatch: got ${v.length}, expected ${EMBEDDING_DIM}. ` +
          `RAG will be degraded. Check EMBEDDING_MODEL and that the Ollama model is pulled.`,
        );
      } else {
        this.logger.log(`Embeddings OK — model=${this.modelVersion} dim=${v.length}`);
      }
    } catch (e) {
      this.logger.warn(
        `Embeddings preflight failed: ${(e as Error).message}. ` +
        `Verify Ollama is reachable at ${this.ollamaUrl} and model "${this.embedModel}" is pulled ` +
        `(ollama pull ${this.embedModel}).`,
      );
    }
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (!texts.length) return [];
    const keys = texts.map(t => this.keyOf(t));
    const out: (Float32Array | null)[] = new Array(texts.length).fill(null);
    const missIdx: number[] = [];

    // L1
    keys.forEach((k, i) => {
      const hit = this.lru.get(k);
      if (hit) out[i] = hit;
      else missIdx.push(i);
    });

    // L2
    if (missIdx.length) {
      const rows = await this.prisma.queryCache.findMany({
        where: { queryHash: { in: missIdx.map(i => keys[i]) } },
      });
      const rowMap = new Map(rows.map(r => [r.queryHash, bufToF32(r.embedding)]));
      const stillMiss: number[] = [];
      for (const i of missIdx) {
        const r = rowMap.get(keys[i]);
        if (r) { out[i] = r; this.lru.set(keys[i], r); }
        else stillMiss.push(i);
      }

      if (stillMiss.length) {
        const provider = await this.callProvider(stillMiss.map(i => texts[i]));
        await Promise.all(stillMiss.map(async (idx, j) => {
          const v = provider[j];
          out[idx] = v;
          this.lru.set(keys[idx], v);
          // fire-and-forget persist
          this.prisma.queryCache.upsert({
            where: { queryHash: keys[idx] },
            create: { queryHash: keys[idx], embedding: f32ToBuf(v) },
            update: { hitCount: { increment: 1 } },
          }).catch(e => this.logger.warn(`cache upsert failed: ${e?.message}`));
        }));
      }
    }

    return out as Float32Array[];
  }

  private keyOf(text: string): string {
    return createHash('sha1')
      .update(`${this.modelVersion}::${text.trim().toLowerCase()}`)
      .digest('hex');
  }

  private async callProvider(texts: string[]): Promise<Float32Array[]> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.embedOllama(texts);
      } catch (e) {
        lastErr = e as Error;
        if (attempt === 0) await sleep(150 * (attempt + 1));
      }
    }
    this.logger.warn(`Ollama embed failed (2 attempts): ${lastErr?.message}. Trying Gemini.`);
    if (!this.geminiKey) throw lastErr;
    return await this.embedGemini(texts);
  }

  private async embedOllama(texts: string[]): Promise<Float32Array[]> {
    // Ollama /api/embed soporta array de input.
    const res = await fetch(`${this.ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, input: texts }),
    });
    if (!res.ok) throw new Error(`Ollama embed ${res.status}: ${await res.text().catch(() => '')}`);
    const data: any = await res.json();
    const raw: number[][] = data.embeddings || (data.embedding ? [data.embedding] : []);
    if (!raw.length) throw new Error('Ollama embed: no vectors');
    return raw.map(v => normalizeDim(Float32Array.from(v)));
  }

  private async embedGemini(texts: string[]): Promise<Float32Array[]> {
    const out: Float32Array[] = [];
    for (const t of texts) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: t }] },
            taskType: 'RETRIEVAL_DOCUMENT',
          }),
        },
      );
      if (!res.ok) throw new Error(`Gemini embed ${res.status}`);
      const data: any = await res.json();
      const v: number[] = data?.embedding?.values || [];
      if (!v.length) throw new Error('Gemini embed: empty vector');
      out.push(normalizeDim(Float32Array.from(v)));
    }
    return out;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeDim(v: Float32Array): Float32Array {
  if (v.length === EMBEDDING_DIM) return v;
  if (v.length > EMBEDDING_DIM) return v.slice(0, EMBEDDING_DIM);
  const padded = new Float32Array(EMBEDDING_DIM);
  padded.set(v);
  return padded;
}

function f32ToBuf(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}
function bufToF32(b: Buffer): Float32Array {
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Float32Array(ab);
}
