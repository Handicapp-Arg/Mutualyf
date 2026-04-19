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
import { OfftopicDetectorService } from "./offtopic-detector.service";
import { TopicClassifierService } from "./topic-classifier.service";
import { OfftopicResponderService } from "./offtopic-responder.service";
import { RagController } from "./rag.controller";
import { PrismaService } from "../prisma/prisma.service";

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
    OfftopicDetectorService,
    TopicClassifierService,
    OfftopicResponderService,
    RetrievalService,
    IngestionService,
    RagService,
    RagMetrics,
  ],
  exports: [
    RagService,
    RetrievalService,
    IngestionService,
    RagConfig,
    TopicClassifierService,
    OfftopicResponderService,
  ],
})
export class RagModule implements OnModuleInit {
  private readonly logger = new Logger(RagModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
    private readonly emb: EmbeddingsService,
    private readonly topic: TopicClassifierService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.knowledgeDoc.count({
      where: { status: "active" },
    });
    this.logger.log(`KB has ${count} active docs`);

    // Auto-rebuild si hay chunks indexados con embModel viejo (típico tras bumpear modelVersion).
    // Fire-and-forget para no bloquear el boot. Skipea si hay demasiados chunks
    // (rebuild masivo puede saturar Ollama; en ese caso requerir trigger manual).
    void this.runAutoRebuildBackground();

    // Centroides del clasificador semántico. Fire-and-forget; si falla, el
    // clasificador cae a modo "empty-kb" y acepta por default (RAG sigue operando).
    void this.topic.rebuildCentroids();

    // Intent prototypes (meta/chitchat) — necesarios para que "sos una IA?",
    // "hola", "gracias", etc no se confundan con off-topic.
    void this.topic.rebuildIntentPrototypes();
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
      // Tras rebuild masivo los centroides también quedan stale.
      await this.topic.rebuildCentroids().catch(() => {});
    } catch (e) {
      this.logger.warn(`Auto-rebuild failed: ${(e as Error).message}`);
    }
  }
}
