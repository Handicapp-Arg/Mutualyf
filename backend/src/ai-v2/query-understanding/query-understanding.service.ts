import { Injectable, Logger } from '@nestjs/common';
import { LlmOrchestrator } from '../llm/llm-orchestrator.service';
import { ChatMessage } from '../llm/llm.interface';
import { tryParseJson } from '../shared/text';

export type Intent =
  | 'informational'
  | 'transactional'
  | 'chitchat'
  | 'clarification'
  | 'unknown';

export interface QueryUnderstanding {
  intent: Intent;
  needsRetrieval: boolean;
  language: string;
  entities: string[];
  normalizedQuery: string;
  expansions: string[];
  hypotheticalAnswer: string;
  ftsTerms: string[];
}

const SYSTEM_PROMPT = `You are a query analyzer for a retrieval system.
Given a user question, produce a JSON object with this exact schema:

{
  "intent": "informational" | "transactional" | "chitchat" | "clarification" | "unknown",
  "needsRetrieval": boolean,
  "language": "es" | "en" | string,
  "entities": string[],
  "normalizedQuery": string,
  "expansions": string[],
  "hypotheticalAnswer": string,
  "ftsTerms": string[]
}

Rules:
- Preserve the user's language in every string.
- needsRetrieval is false ONLY for pure chitchat (greetings, thanks, farewells).
- normalizedQuery: typo-corrected, unambiguous restatement of the user's intent.
- expansions: 3 alternative phrasings that a knowledge base might use, including
  synonyms, technical terms, and lay terms. Cover vocabulary the user did not use.
- hypotheticalAnswer: 1–3 sentences of an *imagined* ideal answer (HyDE). Don't
  say "I don't know" — write what a correct answer would sound like.
- ftsTerms: 3–8 keyword-ish tokens suitable for full-text search, no stopwords,
  including lemma/plural variants a user might search for.
- Do not include commentary. Return only the JSON object.`;

@Injectable()
export class QueryUnderstandingService {
  private readonly log = new Logger(QueryUnderstandingService.name);

  constructor(private readonly llm: LlmOrchestrator) {}

  async analyze(query: string): Promise<QueryUnderstanding> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: query },
    ];

    try {
      const raw = await this.llm.generate(messages, {
        temperature: 0.2,
        maxTokens: 500,
        responseFormat: 'json',
        timeoutMs: 4000,
      });
      const parsed = tryParseJson<Partial<QueryUnderstanding>>(raw);
      if (parsed) return this.coerce(parsed, query);
    } catch (e) {
      this.log.warn(`query understanding failed: ${String(e)}`);
    }
    return this.fallback(query);
  }

  private coerce(
    p: Partial<QueryUnderstanding>,
    original: string,
  ): QueryUnderstanding {
    const expansions = Array.isArray(p.expansions)
      ? p.expansions.filter((x) => typeof x === 'string' && x.trim())
      : [];
    const entities = Array.isArray(p.entities)
      ? p.entities.filter((x) => typeof x === 'string' && x.trim())
      : [];
    const ftsTerms = Array.isArray(p.ftsTerms)
      ? p.ftsTerms.filter((x) => typeof x === 'string' && x.trim())
      : [];
    return {
      intent: (p.intent as Intent) ?? 'informational',
      needsRetrieval: p.needsRetrieval ?? true,
      language: p.language ?? 'es',
      entities,
      normalizedQuery: p.normalizedQuery?.trim() || original,
      expansions: expansions.slice(0, 4),
      hypotheticalAnswer: p.hypotheticalAnswer?.trim() ?? '',
      ftsTerms: ftsTerms.slice(0, 10),
    };
  }

  private fallback(query: string): QueryUnderstanding {
    return {
      intent: 'informational',
      needsRetrieval: true,
      language: 'es',
      entities: [],
      normalizedQuery: query,
      expansions: [],
      hypotheticalAnswer: '',
      ftsTerms: [],
    };
  }
}
