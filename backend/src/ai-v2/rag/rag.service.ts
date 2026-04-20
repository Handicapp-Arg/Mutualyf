import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from '../config/ai.config';
import { LlmOrchestrator } from '../llm/llm-orchestrator.service';
import { ChatMessage } from '../llm/llm.interface';
import { AnaphoraResolverService } from '../query-understanding/anaphora-resolver.service';
import {
  QueryUnderstanding,
  QueryUnderstandingService,
} from '../query-understanding/query-understanding.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { AdaptiveThresholdService } from '../ranking/adaptive-threshold.service';
import {
  RerankedChunk,
  SemanticRerankerService,
} from '../ranking/semantic-reranker.service';
import { estimateTokens } from '../shared/text';

export interface ChatRequest {
  sessionId?: string;
  message: string;
  history: ChatMessage[];
  systemPersona?: string;
}

export interface ChatStreamEvent {
  type: 'meta' | 'chunk' | 'done' | 'error';
  content?: string;
  meta?: Record<string, unknown>;
}

const DEFAULT_PERSONA =
  'You are a helpful assistant. Answer in the user\'s language, concisely and ' +
  'accurately. Ground every factual claim in the supplied context. If the ' +
  'context does not contain the answer, say so clearly and direct the user ' +
  'to contact human support — never invent facts, names, numbers or dates.';

@Injectable()
export class RagService {
  private readonly log = new Logger(RagService.name);

  constructor(
    private readonly cfg: AiConfig,
    private readonly prisma: PrismaService,
    private readonly llm: LlmOrchestrator,
    private readonly anaphora: AnaphoraResolverService,
    private readonly understanding: QueryUnderstandingService,
    private readonly retrieval: RetrievalService,
    private readonly reranker: SemanticRerankerService,
    private readonly threshold: AdaptiveThresholdService,
  ) {}

  async *chat(req: ChatRequest): AsyncIterable<ChatStreamEvent> {
    const started = Date.now();

    const rewritten = await this.anaphora.resolve(req.message, req.history);
    const understanding = await this.understanding.analyze(rewritten);

    yield {
      type: 'meta',
      meta: { phase: 'understood', intent: understanding.intent, rewritten },
    };

    let contextBlock = '';
    let grounded = false;
    let topFinalScore = 0;
    let chunkIds: number[] = [];

    if (understanding.needsRetrieval) {
      const retrieval = await this.retrieval.retrieve(understanding);
      const reranked = await this.reranker.rerank({
        query: understanding.normalizedQuery,
        hypotheticalAnswer: understanding.hypotheticalAnswer,
        chunks: retrieval.chunks,
        limit: this.cfg.retrievalFinalK,
      });

      topFinalScore = reranked[0]?.finalScore ?? 0;
      const t = await this.threshold.get();
      grounded = reranked.length > 0 && topFinalScore >= t;
      chunkIds = reranked.map((c) => c.chunkId);

      if (grounded) {
        contextBlock = this.buildContextBlock(
          reranked,
          this.cfg.contextTokenBudget,
        );
      }

      yield {
        type: 'meta',
        meta: {
          phase: 'retrieved',
          grounded,
          topFinalScore,
          threshold: t,
          expansions: retrieval.diagnostics.expansions,
          domainSim: retrieval.diagnostics.topDomainSim,
        },
      };
    }

    const messages = this.buildMessages(req, understanding, contextBlock, grounded);

    let fullAnswer = '';
    try {
      for await (const piece of this.llm.stream(messages, {
        temperature: 0.3,
        maxTokens: 700,
      })) {
        fullAnswer += piece;
        yield { type: 'chunk', content: piece };
      }
    } catch (e) {
      this.log.error(`llm stream failed: ${String(e)}`);
      yield { type: 'error', content: String(e) };
      return;
    }

    this.prisma.retrievalLog
      .create({
        data: {
          sessionId: req.sessionId ?? null,
          query: req.message,
          rewritten,
          category: null,
          topK: chunkIds.length,
          topScore: topFinalScore,
          chunkIds: JSON.stringify(chunkIds),
          latencyMs: Date.now() - started,
          intent: understanding.intent,
        },
      })
      .catch(() => undefined);

    yield { type: 'done', meta: { latencyMs: Date.now() - started } };
  }

  private buildContextBlock(chunks: RerankedChunk[], budget: number): string {
    const parts: string[] = [];
    let used = 0;
    for (const c of chunks) {
      const block =
        `<doc id="${c.chunkId}" title="${this.esc(c.docTitle)}" source="${this.esc(
          c.docSource,
        )}" score="${c.finalScore.toFixed(3)}">\n${c.content.trim()}\n</doc>`;
      const cost = estimateTokens(block);
      if (used + cost > budget) break;
      parts.push(block);
      used += cost;
    }
    return parts.join('\n');
  }

  private esc(s: string): string {
    return s.replace(/"/g, '&quot;');
  }

  private buildMessages(
    req: ChatRequest,
    u: QueryUnderstanding,
    contextBlock: string,
    grounded: boolean,
  ): ChatMessage[] {
    const persona = req.systemPersona?.trim() || DEFAULT_PERSONA;
    const system: ChatMessage = {
      role: 'system',
      content: grounded
        ? `${persona}\n\nYou have been given verified context below. Base your ` +
          `answer ONLY on it. If a detail is not in the context, omit it.\n\n` +
          `<context>\n${contextBlock}\n</context>`
        : `${persona}\n\nNo verified context was retrieved for this question. ` +
          `Do not invent facts. Politely state that you do not have that ` +
          `information and suggest reaching out to human support.`,
    };

    const trimmedHistory = req.history.slice(-this.cfg.historyTurns);
    return [
      system,
      ...trimmedHistory,
      { role: 'user', content: u.normalizedQuery },
    ];
  }
}
