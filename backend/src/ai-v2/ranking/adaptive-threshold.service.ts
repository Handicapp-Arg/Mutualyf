import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from '../config/ai.config';
import { percentile } from '../shared/vector-math';

/**
 * Learns a relevance threshold from recent successful retrievals.
 * Takes top_score values from the last N retrieval logs whose retrieved
 * chunks ended up producing a grounded answer (i.e., the log exists at all —
 * we treat the log's existence as weak positive feedback; integrate explicit
 * thumbs-up later). Threshold = Pth percentile, bounded below by the floor.
 *
 * This replaces the previous fixed 0.25 cutoff and adapts as the corpus grows.
 */
@Injectable()
export class AdaptiveThresholdService {
  private readonly log = new Logger(AdaptiveThresholdService.name);
  private threshold: number;
  private lastComputed = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: AiConfig,
  ) {
    this.threshold = cfg.thresholdFloor;
  }

  async get(): Promise<number> {
    if (
      Date.now() - this.lastComputed >
      this.cfg.thresholdRecomputeEveryMs
    ) {
      await this.recompute().catch((e) =>
        this.log.warn(`threshold recompute failed: ${String(e)}`),
      );
    }
    return this.threshold;
  }

  async recompute(): Promise<void> {
    const rows = await this.prisma.retrievalLog.findMany({
      select: { topScore: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    if (rows.length < 20) {
      this.threshold = this.cfg.thresholdFloor;
      this.lastComputed = Date.now();
      return;
    }
    const values = rows
      .map((r) => Number(r.topScore))
      .filter((n) => Number.isFinite(n) && n > 0);
    const p = percentile(values, this.cfg.thresholdPercentile);
    this.threshold = Math.max(this.cfg.thresholdFloor, p);
    this.lastComputed = Date.now();
    this.log.log(
      `adaptive threshold: ${this.threshold.toFixed(3)} ` +
        `(p${this.cfg.thresholdPercentile} of ${values.length} logs)`,
    );
  }

  isGrounded(topScore: number): boolean {
    return topScore >= this.threshold;
  }
}
