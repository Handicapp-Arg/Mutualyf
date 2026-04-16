import { Injectable } from "@nestjs/common";
import { RagConfig } from "./rag.config";
import { Hit } from "./rag.types";

/**
 * Señales de relevancia que alimentan la decisión de off-topic.
 * Se computan en `RetrievalService` (tiene acceso a vec/FTS raw) y se pasan
 * acá para mantener esta capa pura y testeable.
 */
export interface OfftopicSignals {
  /** raw score del mejor vec hit — 1/(1+L2) ∈ [0.33, 1] para embeddings normalizados */
  topVecScore: number;
  /** -bm25 del mejor FTS hit — positivo, mayor = mejor match léxico */
  topFtsScore: number;
  fusedHitCount: number;
  vecHitCount: number;
  ftsHitCount: number;
  /** % de chunks que aparecen en top-N tanto de vec como de FTS — consenso entre motores */
  overlapRatio: number;
  /** gap relativo entre top-1 y top-K del fused — 1 = claro ganador, 0 = resultados uniformes (ruido) */
  concentration: number;
  queryWords: number;
  hasHistory: boolean;
  routerConfident: boolean;
  embeddingsAvailable: boolean;
}

export interface OfftopicDecision {
  isOfftopic: boolean;
  /** 0..1 — confianza de que la query es relevante a la KB */
  confidence: number;
  /** umbral efectivo tras los multiplicadores dinámicos */
  effectiveThreshold: number;
  /** motivo corto para observabilidad/tuning */
  reason: string;
}

/**
 * Decide si una query es off-topic combinando múltiples señales.
 *
 * Reemplaza el threshold único sobre `topVecScore` por un score ponderado
 * (vec + FTS + overlap + concentration) con umbral dinámico según características
 * de la query. Pensado para ser tunable en producción vía env vars sin redeploy.
 *
 * Reglas de bypass (early-return antes del scorer):
 *   1. Guard desactivado globalmente
 *   2. Embeddings caídos → no podemos juzgar semánticamente
 *   3. Hay history → confiamos en el LLM para resolver pronombres/follow-ups
 *   4. FTS veto: match léxico fuerte → la palabra está en la KB, no es off-topic
 */
@Injectable()
export class OfftopicDetectorService {
  constructor(private readonly cfg: RagConfig) {}

  detect(signals: OfftopicSignals): OfftopicDecision {
    if (!this.cfg.enableOfftopicGuard) {
      return this.accept(1, 0, "guard-disabled");
    }
    if (!signals.embeddingsAvailable) {
      return this.accept(0.5, 0, "embeddings-unavailable");
    }
    if (signals.hasHistory) {
      return this.accept(0.5, 0, "has-history");
    }
    if (signals.topFtsScore >= this.cfg.offtopicFtsVeto) {
      return this.accept(1, 0, "fts-veto");
    }
    if (signals.fusedHitCount === 0) {
      return this.reject(
        0,
        this.cfg.offtopicBaseThreshold,
        "no-hits",
      );
    }

    const vecNorm = clamp01(signals.topVecScore / this.cfg.offtopicVecTarget);
    const ftsNorm =
      signals.topFtsScore > 0
        ? clamp01(signals.topFtsScore / this.cfg.offtopicFtsTarget)
        : 0;

    const confidence = clamp01(
      this.cfg.offtopicWeightVec * vecNorm +
        this.cfg.offtopicWeightFts * ftsNorm +
        this.cfg.offtopicWeightOverlap * signals.overlapRatio +
        this.cfg.offtopicWeightConcentration * signals.concentration,
    );

    let threshold = this.cfg.offtopicBaseThreshold;
    if (signals.queryWords < this.cfg.offtopicShortQueryWords) {
      threshold *= this.cfg.offtopicShortQueryRelax;
    }
    if (signals.routerConfident) {
      threshold *= this.cfg.offtopicRouterConfidentRelax;
    }

    if (confidence < threshold) {
      return this.reject(confidence, threshold, "low-confidence");
    }
    return this.accept(confidence, threshold, "above-threshold");
  }

  private accept(
    confidence: number,
    effectiveThreshold: number,
    reason: string,
  ): OfftopicDecision {
    return { isOfftopic: false, confidence, effectiveThreshold, reason };
  }

  private reject(
    confidence: number,
    effectiveThreshold: number,
    reason: string,
  ): OfftopicDecision {
    return { isOfftopic: true, confidence, effectiveThreshold, reason };
  }
}

/**
 * Overlap entre dos rankings: % de chunk_ids presentes en top-N de ambos.
 * Señal de consenso — si vec y FTS coinciden en los mismos chunks, alta confianza.
 */
export function computeOverlapRatio(a: Hit[], b: Hit[], n: number): number {
  if (n <= 0 || a.length === 0 || b.length === 0) return 0;
  const topA = new Set(a.slice(0, n).map((h) => h.chunkId));
  const sliceB = b.slice(0, n);
  if (sliceB.length === 0) return 0;
  let hits = 0;
  for (const h of sliceB) if (topA.has(h.chunkId)) hits++;
  return hits / Math.min(n, Math.max(a.length, sliceB.length));
}

/**
 * Concentración = gap relativo entre top-1 y top-K. Detecta "claro ganador"
 * vs "resultados uniformes" (ruido). Útil incluso con scores absolutos bajos:
 * si el top-1 es mucho mejor que el top-K, el match es significativo.
 */
export function computeConcentration(hits: Hit[], k: number): number {
  if (hits.length === 0 || k <= 0) return 0;
  const top = hits[0].score;
  if (top <= 0) return 0;
  const tailIdx = Math.min(k - 1, hits.length - 1);
  const tail = hits[tailIdx].score;
  return clamp01((top - tail) / top);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
