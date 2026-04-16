import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tuning knobs del stack RAG — todos override-ables por env.
 * Evita hardcode en las services: cualquier ajuste productivo
 * (bajar threshold, subir k, cambiar chunk size) se hace sin redeploy.
 */
@Injectable()
export class RagConfig {
  // --- Retrieval ---
  readonly offtopicThreshold: number;    // RAG_OFFTOPIC_THRESHOLD (default 0.10)
  readonly rrfK: number;                  // RAG_RRF_K (default 60)
  readonly minWordsForOfftopic: number;   // RAG_MIN_WORDS_OFFTOPIC (default 5)
  readonly kSmall: number;                // RAG_K_SMALL (default 2)
  readonly kMedium: number;               // RAG_K_MEDIUM (default 4)
  readonly kLarge: number;                // RAG_K_LARGE (default 6)

  // --- Prompt builder ---
  readonly contextTokenBudget: number;    // RAG_CONTEXT_TOKEN_BUDGET (default 1200)
  readonly maxHistoryMessages: number;    // RAG_MAX_HISTORY (default 6)

  // --- Chunking ---
  readonly chunkSize: number;             // RAG_CHUNK_SIZE (default 500)
  readonly chunkOverlap: number;          // RAG_CHUNK_OVERLAP (default 80)
  readonly chunkMinChars: number;         // RAG_CHUNK_MIN_CHARS (default 20)

  // --- Ingestion ---
  readonly embedBatchSize: number;        // RAG_EMBED_BATCH (default 16)
  readonly maxUploadBytes: number;        // RAG_MAX_UPLOAD_MB (default 10) * 1024*1024

  // --- Embeddings ---
  readonly embedModel: string;            // EMBEDDING_MODEL (default nomic-embed-text)
  readonly embedDim: number;              // EMBEDDING_DIM (default 768)
  readonly lruMax: number;                // RAG_LRU_MAX (default 2000)
  readonly lruTtlMs: number;              // RAG_LRU_TTL_MS (default 3600000)

  // --- Query rewriter ---
  readonly rewriterTimeoutMs: number;     // RAG_REWRITE_TIMEOUT_MS (default 300)

  // --- Toggles ---
  readonly enableRewriter: boolean;       // RAG_ENABLE_REWRITER (default true)
  readonly enableOfftopicGuard: boolean;  // RAG_ENABLE_OFFTOPIC (default true)

  constructor(cfg: ConfigService) {
    const num = (k: string, d: number) => Number(cfg.get<string>(k, String(d))) || d;
    const bool = (k: string, d: boolean) => {
      const v = cfg.get<string>(k);
      if (v === undefined || v === '') return d;
      return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
    };

    this.offtopicThreshold   = num('RAG_OFFTOPIC_THRESHOLD', 0.10);
    this.rrfK                = num('RAG_RRF_K', 60);
    this.minWordsForOfftopic = num('RAG_MIN_WORDS_OFFTOPIC', 5);
    this.kSmall              = num('RAG_K_SMALL', 2);
    this.kMedium             = num('RAG_K_MEDIUM', 4);
    this.kLarge              = num('RAG_K_LARGE', 6);

    this.contextTokenBudget  = num('RAG_CONTEXT_TOKEN_BUDGET', 1200);
    this.maxHistoryMessages  = num('RAG_MAX_HISTORY', 6);

    this.chunkSize           = num('RAG_CHUNK_SIZE', 500);
    this.chunkOverlap        = num('RAG_CHUNK_OVERLAP', 80);
    this.chunkMinChars       = num('RAG_CHUNK_MIN_CHARS', 20);

    this.embedBatchSize      = num('RAG_EMBED_BATCH', 16);
    this.maxUploadBytes      = num('RAG_MAX_UPLOAD_MB', 10) * 1024 * 1024;

    this.embedModel          = cfg.get<string>('EMBEDDING_MODEL', 'nomic-embed-text');
    this.embedDim            = num('EMBEDDING_DIM', 768);
    this.lruMax              = num('RAG_LRU_MAX', 2000);
    this.lruTtlMs            = num('RAG_LRU_TTL_MS', 3_600_000);

    this.rewriterTimeoutMs   = num('RAG_REWRITE_TIMEOUT_MS', 300);

    this.enableRewriter      = bool('RAG_ENABLE_REWRITER', true);
    this.enableOfftopicGuard = bool('RAG_ENABLE_OFFTOPIC', true);
  }

  snapshot() {
    return { ...this } as Record<string, unknown>;
  }
}
