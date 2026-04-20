export interface ScoredCandidate {
  id: number;
  rank: number;
  score: number;
}

export interface FusedCandidate {
  id: number;
  score: number;
  appearances: number;
}

/**
 * Reciprocal Rank Fusion. Takes N rankings and emits a unified ranking.
 *   score(d) = Σ 1 / (k + rank_i(d))
 * K=60 is the standard smoothing constant from Cormack et al. 2009.
 */
export class RrfFusion {
  static fuse(
    rankings: ScoredCandidate[][],
    limit: number,
    k = 60,
  ): FusedCandidate[] {
    const accum = new Map<number, FusedCandidate>();
    for (const ranking of rankings) {
      for (const c of ranking) {
        const prev = accum.get(c.id) ?? { id: c.id, score: 0, appearances: 0 };
        prev.score += 1 / (k + c.rank);
        prev.appearances += 1;
        accum.set(c.id, prev);
      }
    }
    return [...accum.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
