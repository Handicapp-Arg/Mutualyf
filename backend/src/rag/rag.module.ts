import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroqService } from '../ai/groq.service';
import { ConfigModule } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingsService } from './embeddings.service';
import { RouterService } from './router.service';
import { QueryRewriterService } from './query-rewriter.service';
import { RetrievalService } from './retrieval.service';
import { IngestionService } from './ingestion.service';
import { RagService } from './rag.service';
import { RagMetrics } from './rag.metrics';
import { RagConfig } from './rag.config';
import { RagController } from './rag.controller';
import { PrismaService } from '../prisma/prisma.service';
import { KNOWLEDGE_SEED } from './seed/knowledge.seed';

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
    // Auto-seed inicial si no hay docs activos
    const count = await this.prisma.knowledgeDoc.count({ where: { status: 'active' } });
    if (count === 0) {
      this.logger.log('No knowledge docs found — seeding initial KB...');
      for (const doc of KNOWLEDGE_SEED) {
        try { await this.ingestion.ingestText(doc); }
        catch (e) { this.logger.warn(`seed "${doc.title}" failed: ${(e as Error).message}`); }
      }
      this.logger.log(`Seeded ${KNOWLEDGE_SEED.length} initial docs`);
    } else {
      this.logger.log(`KB has ${count} active docs — skip seeding`);
    }
  }
}
