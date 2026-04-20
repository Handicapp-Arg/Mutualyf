import { Injectable } from '@nestjs/common';

const num = (v: string | undefined, d: number) => (v ? Number(v) : d);
const str = (v: string | undefined, d: string) => v ?? d;

@Injectable()
export class AiConfig {
  readonly embedModel = str(process.env.EMBED_MODEL, 'nomic-embed-text:v1.5');
  readonly embedDims = num(process.env.EMBED_DIMS, 768);
  readonly ollamaHost = str(process.env.OLLAMA_HOST, 'http://localhost:11434');
  readonly ollamaLlmModel = str(process.env.OLLAMA_LLM_MODEL, 'phi3:latest');

  readonly groqKey = process.env.GROQ_API_KEY ?? '';
  readonly groqModel = str(process.env.GROQ_MODEL, 'llama-3.1-8b-instant');

  readonly geminiKey = process.env.GEMINI_API_KEY ?? '';
  readonly geminiLlmModel = str(process.env.GEMINI_MODEL, 'gemini-2.5-flash');
  readonly geminiEmbedModel = str(
    process.env.GEMINI_EMBED_MODEL,
    'text-embedding-004',
  );

  readonly retrievalTopK = num(process.env.RETRIEVAL_TOP_K, 12);
  readonly retrievalFinalK = num(process.env.RETRIEVAL_FINAL_K, 4);
  readonly retrievalExpansions = num(process.env.RETRIEVAL_EXPANSIONS, 3);

  readonly contextTokenBudget = num(process.env.CONTEXT_TOKEN_BUDGET, 1400);
  readonly historyTurns = num(process.env.HISTORY_TURNS, 6);

  readonly embedCacheSize = num(process.env.EMBED_CACHE_SIZE, 4000);
  readonly embedCacheTtlMs = num(process.env.EMBED_CACHE_TTL_MS, 60 * 60 * 1000);
  readonly retrievalCacheSize = num(process.env.RETRIEVAL_CACHE_SIZE, 500);
  readonly retrievalCacheTtlMs = num(
    process.env.RETRIEVAL_CACHE_TTL_MS,
    5 * 60 * 1000,
  );

  readonly circuitBreakerThreshold = num(process.env.CB_THRESHOLD, 3);
  readonly circuitBreakerCooldownMs = num(process.env.CB_COOLDOWN_MS, 30_000);

  readonly thresholdPercentile = num(process.env.THRESHOLD_PERCENTILE, 25);
  readonly thresholdFloor = Number(process.env.THRESHOLD_FLOOR ?? '0.15');
  readonly thresholdRecomputeEveryMs = num(
    process.env.THRESHOLD_RECOMPUTE_MS,
    10 * 60 * 1000,
  );
}
