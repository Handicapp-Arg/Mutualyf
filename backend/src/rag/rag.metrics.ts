import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RetrievalLogEntry {
  sessionId?: string;
  query: string;
  rewritten?: string;
  category?: string | null;
  topK: number;
  topScore: number;
  chunkIds: number[];
  latencyMs: number;
  intent?: string;
}

@Injectable()
export class RagMetrics {
  private readonly logger = new Logger('RAG');

  constructor(private readonly prisma: PrismaService) {}

  retrieval(e: RetrievalLogEntry): void {
    this.logger.log(
      `retrieval intent=${e.intent} cat=${e.category ?? '-'} k=${e.topK} top=${e.topScore.toFixed(3)} ms=${e.latencyMs} chunks=[${e.chunkIds.join(',')}] q="${e.query.slice(0, 80)}"`,
    );
    // fire-and-forget persistent log (trunca query y rewritten)
    this.prisma.retrievalLog.create({
      data: {
        sessionId: e.sessionId,
        query: e.query.slice(0, 500),
        rewritten: e.rewritten?.slice(0, 500),
        category: e.category,
        topK: e.topK,
        topScore: e.topScore,
        chunkIds: JSON.stringify(e.chunkIds),
        latencyMs: e.latencyMs,
        intent: e.intent,
      },
    }).catch(err => this.logger.warn(`retrieval log failed: ${err?.message}`));
  }
}
