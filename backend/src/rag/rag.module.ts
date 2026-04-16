import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GroqService } from "../ai/groq.service";
import { ConfigModule } from "@nestjs/config";
import { VectorStoreService } from "./vector-store.service";
import { EmbeddingsService } from "./embeddings.service";
import { RouterService } from "./router.service";
import { QueryRewriterService } from "./query-rewriter.service";
import { RetrievalService } from "./retrieval.service";
import { IngestionService } from "./ingestion.service";
import { RagService } from "./rag.service";
import { RagMetrics } from "./rag.metrics";
import { RagConfig } from "./rag.config";
import { RagController } from "./rag.controller";
import { PrismaService } from "../prisma/prisma.service";
import { KNOWLEDGE_SEED } from "./seed/knowledge.seed";

const AUTO_REBUILD_MAX_CHUNKS = 500;

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [RagController],
  providers: [
    RagConfig,
    GroqService,
    VectorStoreService,
    EmbeddingsService,
    RouterService,
    QueryRewriterService,
    RetrievalService,
    IngestionService,
    RagService,
    RagMetrics,
  ],
  exports: [RagService, RetrievalService, IngestionService, RagConfig],
})
export class RagModule implements OnModuleInit {
  private readonly logger = new Logger(RagModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
    private readonly emb: EmbeddingsService,
  ) {}

  async onModuleInit() {
    // Auto-seed inicial si no hay docs activos.
    // Fire-and-forget: el seed dispara N embeddings (Ollama puede tardar minutos
    // si está cold). Bloquear el startup haría que la app no levante mientras tanto.
    const count = await this.prisma.knowledgeDoc.count({
      where: { status: "active" },
    });
    if (count === 0) {
      this.logger.log(
        "No knowledge docs found — seeding initial KB in background...",
      );
      void this.runSeedBackground();
      return;
    }
    this.logger.log(`KB has ${count} active docs — skip seeding`);

    // Auto-rebuild si hay chunks indexados con embModel viejo (típico tras bumpear modelVersion).
    // Fire-and-forget para no bloquear el boot. Skipea si hay demasiados chunks
    // (rebuild masivo puede saturar Ollama; en ese caso requerir trigger manual).
    void this.runAutoRebuildBackground();
  }

  private async runAutoRebuildBackground(): Promise<void> {
    try {
      const currentModel = this.emb.model;
      const stale = await this.prisma.knowledgeChunk.count({
        where: {
          doc: { status: "active" },
          embModel: { not: currentModel },
        },
      });
      if (stale === 0) return;

      if (stale > AUTO_REBUILD_MAX_CHUNKS) {
        this.logger.warn(
          `Found ${stale} chunks with stale embed model (current=${currentModel}), ` +
            `exceeds AUTO_REBUILD_MAX_CHUNKS=${AUTO_REBUILD_MAX_CHUNKS}. ` +
            `Run POST /admin/rag/rebuild manually.`,
        );
        return;
      }

      this.logger.log(
        `Auto-rebuilding ${stale} stale chunks → ${currentModel} (background)...`,
      );
      const t0 = Date.now();
      const { rebuilt } = await this.ingestion.rebuildIndex();
      this.logger.log(
        `Auto-rebuild done: ${rebuilt} chunks in ${Date.now() - t0}ms`,
      );
    } catch (e) {
      this.logger.warn(`Auto-rebuild failed: ${(e as Error).message}`);
    }
  }

  private async runSeedBackground(): Promise<void> {
    let ok = 0,
      failed = 0;
    for (const doc of KNOWLEDGE_SEED) {
      try {
        await this.ingestion.ingestText(doc);
        ok++;
      } catch (e) {
        failed++;
        this.logger.warn(`seed "${doc.title}" failed: ${(e as Error).message}`);
      }
    }
    this.logger.log(
      `Background seed done: ok=${ok} failed=${failed} total=${KNOWLEDGE_SEED.length}`,
    );
  }
}
