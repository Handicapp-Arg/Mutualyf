import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface OfftopicDebug {
  confidence: number;
  effectiveThreshold: number;
  reason: string;
  topVecScore: number;
  topFtsScore: number;
  overlapRatio: number;
  concentration: number;
  queryWords: number;
  routerConfident: boolean;
}

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
  offtopic?: OfftopicDebug;
}

@Injectable()
export class RagMetrics {
  private readonly logger = new Logger("RAG");

  constructor(private readonly prisma: PrismaService) {}

  retrieval(e: RetrievalLogEntry): void {
    const off = e.offtopic
      ? ` off=${e.offtopic.reason}(conf=${e.offtopic.confidence.toFixed(2)}/thr=${e.offtopic.effectiveThreshold.toFixed(2)} vec=${e.offtopic.topVecScore.toFixed(2)} fts=${e.offtopic.topFtsScore.toFixed(2)} ov=${e.offtopic.overlapRatio.toFixed(2)} con=${e.offtopic.concentration.toFixed(2)} w=${e.offtopic.queryWords} rc=${e.offtopic.routerConfident ? 1 : 0})`
      : "";
    this.logger.log(
      `retrieval intent=${e.intent} cat=${e.category ?? "-"} k=${e.topK} top=${e.topScore.toFixed(3)} ms=${e.latencyMs} chunks=[${e.chunkIds.join(",")}]${off} q="${e.query.slice(0, 80)}"`,
    );
    // fire-and-forget persistent log (trunca query y rewritten)
    this.prisma.retrievalLog
      .create({
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
      })
      .catch((err) =>
        this.logger.warn(`retrieval log failed: ${err?.message}`),
      );
  }
}
