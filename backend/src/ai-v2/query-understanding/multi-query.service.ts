import { Injectable } from '@nestjs/common';
import { QueryUnderstanding } from './query-understanding.service';

/**
 * Thin assembler over the structured output of QueryUnderstandingService.
 * Exists so downstream code (retrieval, ranking) depends on a stable
 * abstraction rather than peering into the LLM-produced object directly.
 *
 * This intentionally does NOT do keyword expansion or synonym lookup —
 * expansions come from the LLM's semantic understanding, not hand-written
 * lists, per the project's "no hardcoded rules" principle.
 */
@Injectable()
export class MultiQueryService {
  build(u: QueryUnderstanding): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (s?: string) => {
      if (!s) return;
      const key = s.trim().toLowerCase();
      if (key.length < 2 || seen.has(key)) return;
      seen.add(key);
      out.push(s.trim());
    };
    push(u.normalizedQuery);
    for (const e of u.expansions) push(e);
    if (u.hypotheticalAnswer) push(u.hypotheticalAnswer);
    return out;
  }
}
