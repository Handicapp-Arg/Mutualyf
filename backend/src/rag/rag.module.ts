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
  ) {}

  async onModuleInit() {
    // Auto-seed inicial si no hay docs activos.
    // Fire-and-forget: el seed dispara N embeddings (Ollama puede tardar minutos
    // si está cold). Bloquear el startup haría que la app no levante mientras tanto.
    const count = await this.prisma.knowledgeDoc.count({
      where: { status: "active" },
    });
    if (count > 0) {
      this.logger.log(`KB has ${count} active docs — skip seeding`);
      return;
    }
    this.logger.log(
      "No knowledge docs found — seeding initial KB in background...",
    );
    void this.runSeedBackground();
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
