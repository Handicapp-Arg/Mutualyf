import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Tuning knobs del stack RAG — todos override-ables por env.
 * Evita hardcode en las services: cualquier ajuste productivo
 * (bajar threshold, subir k, cambiar chunk size) se hace sin redeploy.
 */
@Injectable()
export class RagConfig {
  // --- Retrieval ---
  readonly rrfK: number; // RAG_RRF_K (default 60)
  readonly kSmall: number; // RAG_K_SMALL (default 2)
  readonly kMedium: number; // RAG_K_MEDIUM (default 4)
  readonly kLarge: number; // RAG_K_LARGE (default 6)

  // --- Off-topic detector (multi-signal scorer) ---
  // Ver OfftopicDetectorService. Los defaults están calibrados para embeddings
  // normalizados (score = 1/(1+L2) ∈ [0.33, 1]) + BM25 invertido de FTS5.
  readonly offtopicBaseThreshold: number; // RAG_OFFTOPIC_BASE (0..1, default 0.25)
  readonly offtopicWeightVec: number; // RAG_OFFTOPIC_W_VEC (default 0.40)
  readonly offtopicWeightFts: number; // RAG_OFFTOPIC_W_FTS (default 0.30)
  readonly offtopicWeightOverlap: number; // RAG_OFFTOPIC_W_OVERLAP (default 0.20)
  readonly offtopicWeightConcentration: number; // RAG_OFFTOPIC_W_CONC (default 0.10)
  /** Vec score considerado "plenamente relevante" (normaliza vecNorm a 1). */
  readonly offtopicVecTarget: number; // RAG_OFFTOPIC_VEC_TARGET (default 0.55)
  /** -BM25 considerado "plenamente relevante" (normaliza ftsNorm a 1). */
  readonly offtopicFtsTarget: number; // RAG_OFFTOPIC_FTS_TARGET (default 5)
  /** -BM25 mínimo para vetar off-topic (match léxico fuerte = la palabra está en la KB). */
  readonly offtopicFtsVeto: number; // RAG_OFFTOPIC_FTS_VETO (default 2)
  /** Queries con menos de N palabras usan umbral relajado. */
  readonly offtopicShortQueryWords: number; // RAG_OFFTOPIC_SHORT_WORDS (default 4)
  /** Multiplicador del umbral para queries cortas (<1 = más permisivo). */
  readonly offtopicShortQueryRelax: number; // RAG_OFFTOPIC_SHORT_RELAX (default 0.6)
  /** Multiplicador del umbral si el router clasificó con confianza. */
  readonly offtopicRouterConfidentRelax: number; // RAG_OFFTOPIC_ROUTER_RELAX (default 0.7)
  /** Cuántos hits comparar entre vec y FTS para calcular overlap. */
  readonly offtopicOverlapTopN: number; // RAG_OFFTOPIC_OVERLAP_N (default 5)

  // --- Prompt builder ---
  readonly contextTokenBudget: number; // RAG_CONTEXT_TOKEN_BUDGET (default 1200)
  readonly maxHistoryMessages: number; // RAG_MAX_HISTORY (default 6)

  // --- Chunking ---
  readonly chunkSize: number; // RAG_CHUNK_SIZE (default 500)
  readonly chunkOverlap: number; // RAG_CHUNK_OVERLAP (default 80)
  readonly chunkMinChars: number; // RAG_CHUNK_MIN_CHARS (default 20)

  // --- Ingestion ---
  readonly embedBatchSize: number; // RAG_EMBED_BATCH (default 16)
  readonly maxUploadBytes: number; // RAG_MAX_UPLOAD_MB (default 10) * 1024*1024

  // --- Embeddings ---
  readonly embedModel: string; // EMBEDDING_MODEL (default nomic-embed-text)
  readonly embedDim: number; // EMBEDDING_DIM (default 768)
  readonly lruMax: number; // RAG_LRU_MAX (default 2000)
  readonly lruTtlMs: number; // RAG_LRU_TTL_MS (default 3600000)

  // --- Query rewriter ---
  readonly rewriterTimeoutMs: number; // RAG_REWRITE_TIMEOUT_MS (default 300)

  // --- Topic classifier (semantic relevance, reemplaza al keyword guard) ---
  /** score cosine-normalizado (0..1) a partir del cual la query es claramente relevante */
  readonly topicThresholdHigh: number; // TOPIC_T_HIGH (default 0.72)
  /** score por debajo del cual es claramente off-topic */
  readonly topicThresholdLow: number; // TOPIC_T_LOW (default 0.55)
  /** timeout del LLM judge en zona ambigua */
  readonly topicLlmJudgeTimeoutMs: number; // TOPIC_LLM_TIMEOUT_MS (default 1500)
  readonly topicCacheMax: number; // TOPIC_CACHE_MAX (default 5000)
  readonly topicCacheTtlMs: number; // TOPIC_CACHE_TTL_MS (default 3600000)
  /** mínimo de chunks activos para construir un centroide válido */
  readonly topicMinChunksPerCategory: number; // TOPIC_MIN_CHUNKS (default 2)
  /** cosine crudo (-1..1) mínimo para considerar match de intent (meta/chitchat) */
  readonly topicIntentThreshold: number; // TOPIC_INTENT_T (default 0.55)
  /** timeout de la generación LLM de respuestas off-topic dinámicas */
  readonly offtopicGenTimeoutMs: number; // OFFTOPIC_GEN_TIMEOUT_MS (default 2500)

  // --- Semantic chunker ---
  readonly chunkerSegmentChars: number; // RAG_CHUNKER_SEGMENT_CHARS (default 6000)
  readonly chunkerSegmentOverlapLines: number; // RAG_CHUNKER_OVERLAP_LINES — líneas del segmento anterior que se repiten al inicio del siguiente (default 3)
  readonly chunkerTimeoutMs: number; // RAG_CHUNKER_TIMEOUT_MS (default 15000)
  readonly chunkerMinFactChars: number; // RAG_CHUNKER_MIN_FACT_CHARS (default 15)
  readonly chunkerMaxFactChars: number; // RAG_CHUNKER_MAX_FACT_CHARS (default 1200)

  // --- Enrichment (pre-chunker, solo si se detectan problemas de calidad) ---
  readonly enableEnrichment: boolean; // RAG_ENABLE_ENRICHMENT (default true)
  readonly enrichmentTimeoutMs: number; // RAG_ENRICHMENT_TIMEOUT_MS (default 25000)
  readonly enrichmentMaxTokens: number; // RAG_ENRICHMENT_MAX_TOKENS (default 2048)
  readonly enrichmentPipeRatio: number; // RAG_ENRICHMENT_PIPE_RATIO — fracción de líneas con pipes para activar (default 0.15)
  readonly enrichmentNoiseRatio: number; // RAG_ENRICHMENT_NOISE_RATIO — fracción de chars no-estándar para activar (default 0.03)
  readonly enrichmentFlatRatio: number; // RAG_ENRICHMENT_FLAT_RATIO — fracción de líneas cortas para activar (default 0.60)
  readonly enrichmentFlatMinLines: number; // RAG_ENRICHMENT_FLAT_MIN_LINES — mínimo de líneas para aplicar flat-list check (default 5)

  // --- Toggles ---
  readonly enableRewriter: boolean; // RAG_ENABLE_REWRITER (default true)
  readonly enableOfftopicGuard: boolean; // RAG_ENABLE_OFFTOPIC (default true)
  readonly enableTopicClassifier: boolean; // RAG_ENABLE_TOPIC_CLASSIFIER (default true)

  constructor(cfg: ConfigService) {
    const num = (k: string, d: number) =>
      Number(cfg.get<string>(k, String(d))) || d;
    const bool = (k: string, d: boolean) => {
      const v = cfg.get<string>(k);
      if (v === undefined || v === "") return d;
      return ["1", "true", "yes", "on"].includes(v.toLowerCase());
    };

    this.rrfK = num("RAG_RRF_K", 60);
    this.kSmall = num("RAG_K_SMALL", 3);
    this.kMedium = num("RAG_K_MEDIUM", 6);
    this.kLarge = num("RAG_K_LARGE", 12);

    this.offtopicBaseThreshold = num("RAG_OFFTOPIC_BASE", 0.25);
    this.offtopicWeightVec = num("RAG_OFFTOPIC_W_VEC", 0.4);
    this.offtopicWeightFts = num("RAG_OFFTOPIC_W_FTS", 0.3);
    this.offtopicWeightOverlap = num("RAG_OFFTOPIC_W_OVERLAP", 0.2);
    this.offtopicWeightConcentration = num("RAG_OFFTOPIC_W_CONC", 0.1);
    this.offtopicVecTarget = num("RAG_OFFTOPIC_VEC_TARGET", 0.55);
    this.offtopicFtsTarget = num("RAG_OFFTOPIC_FTS_TARGET", 5);
    // ts_rank de PostgreSQL retorna 0..1. El valor anterior (2) nunca se alcanzaba.
    this.offtopicFtsVeto = num("RAG_OFFTOPIC_FTS_VETO", 0.1);
    this.offtopicShortQueryWords = num("RAG_OFFTOPIC_SHORT_WORDS", 4);
    this.offtopicShortQueryRelax = num("RAG_OFFTOPIC_SHORT_RELAX", 0.6);
    this.offtopicRouterConfidentRelax = num("RAG_OFFTOPIC_ROUTER_RELAX", 0.7);
    this.offtopicOverlapTopN = num("RAG_OFFTOPIC_OVERLAP_N", 5);

    this.contextTokenBudget = num("RAG_CONTEXT_TOKEN_BUDGET", 3500);
    this.maxHistoryMessages = num("RAG_MAX_HISTORY", 6);

    this.chunkSize = num("RAG_CHUNK_SIZE", 500);
    this.chunkOverlap = num("RAG_CHUNK_OVERLAP", 80);
    this.chunkMinChars = num("RAG_CHUNK_MIN_CHARS", 20);

    this.embedBatchSize = num("RAG_EMBED_BATCH", 16);
    this.maxUploadBytes = num("RAG_MAX_UPLOAD_MB", 10) * 1024 * 1024;

    this.embedModel = cfg.get<string>("EMBEDDING_MODEL", "nomic-embed-text");
    this.embedDim = num("EMBEDDING_DIM", 768);
    this.lruMax = num("RAG_LRU_MAX", 2000);
    this.lruTtlMs = num("RAG_LRU_TTL_MS", 3_600_000);

    // 300ms era insuficiente para una API call; se usaba siempre el fallback heurístico.
    this.rewriterTimeoutMs = num("RAG_REWRITE_TIMEOUT_MS", 2000);

    this.topicThresholdHigh = num("TOPIC_T_HIGH", 0.60);
    this.topicThresholdLow = num("TOPIC_T_LOW", 0.45);
    this.topicLlmJudgeTimeoutMs = num("TOPIC_LLM_TIMEOUT_MS", 1500);
    this.topicCacheMax = num("TOPIC_CACHE_MAX", 5000);
    this.topicCacheTtlMs = num("TOPIC_CACHE_TTL_MS", 3_600_000);
    this.topicMinChunksPerCategory = num("TOPIC_MIN_CHUNKS", 2);
    this.topicIntentThreshold = num("TOPIC_INTENT_T", 0.55);
    this.offtopicGenTimeoutMs = num("OFFTOPIC_GEN_TIMEOUT_MS", 2500);

    this.chunkerSegmentChars = num("RAG_CHUNKER_SEGMENT_CHARS", 6_000);
    this.chunkerSegmentOverlapLines = num("RAG_CHUNKER_OVERLAP_LINES", 3);
    this.chunkerTimeoutMs = num("RAG_CHUNKER_TIMEOUT_MS", 15_000);
    this.chunkerMinFactChars = num("RAG_CHUNKER_MIN_FACT_CHARS", 15);
    this.chunkerMaxFactChars = num("RAG_CHUNKER_MAX_FACT_CHARS", 1_200);

    this.enableEnrichment = bool("RAG_ENABLE_ENRICHMENT", true);
    this.enrichmentTimeoutMs = num("RAG_ENRICHMENT_TIMEOUT_MS", 25_000);
    this.enrichmentMaxTokens = num("RAG_ENRICHMENT_MAX_TOKENS", 2_048);
    this.enrichmentPipeRatio = num("RAG_ENRICHMENT_PIPE_RATIO", 0.15);
    this.enrichmentNoiseRatio = num("RAG_ENRICHMENT_NOISE_RATIO", 0.03);
    this.enrichmentFlatRatio = num("RAG_ENRICHMENT_FLAT_RATIO", 0.60);
    this.enrichmentFlatMinLines = num("RAG_ENRICHMENT_FLAT_MIN_LINES", 5);

    this.enableRewriter = bool("RAG_ENABLE_REWRITER", true);
    this.enableOfftopicGuard = bool("RAG_ENABLE_OFFTOPIC", true);
    this.enableTopicClassifier = bool("RAG_ENABLE_TOPIC_CLASSIFIER", true);
  }

  snapshot() {
    return { ...this } as Record<string, unknown>;
  }
}
