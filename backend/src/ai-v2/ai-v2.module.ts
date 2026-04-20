import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiConfig } from './config/ai.config';
import { MultiTierCacheService } from './cache/multi-tier-cache.service';
import { OllamaEmbeddingProvider } from './embeddings/providers/ollama.provider';
import { GeminiEmbeddingProvider } from './embeddings/providers/gemini.provider';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { SemanticChunkerService } from './chunking/semantic-chunker.service';
import { GroqProvider } from './llm/providers/groq.provider';
import { GeminiLlmProvider } from './llm/providers/gemini.provider';
import { OllamaLlmProvider } from './llm/providers/ollama.provider';
import { LlmOrchestrator } from './llm/llm-orchestrator.service';
import { AnaphoraResolverService } from './query-understanding/anaphora-resolver.service';
import { QueryUnderstandingService } from './query-understanding/query-understanding.service';
import { VectorSearchRepository } from './retrieval/vector-search.repository';
import { FtsSearchRepository } from './retrieval/fts-search.repository';
import { DomainInferenceService } from './retrieval/domain-inference.service';
import { RetrievalService } from './retrieval/retrieval.service';
import { SemanticRerankerService } from './ranking/semantic-reranker.service';
import { AdaptiveThresholdService } from './ranking/adaptive-threshold.service';
import { RagService } from './rag/rag.service';
import { RagController } from './rag/rag.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [
    AiConfig,
    MultiTierCacheService,
    OllamaEmbeddingProvider,
    GeminiEmbeddingProvider,
    EmbeddingsService,
    SemanticChunkerService,
    GroqProvider,
    GeminiLlmProvider,
    OllamaLlmProvider,
    LlmOrchestrator,
    AnaphoraResolverService,
    QueryUnderstandingService,
    VectorSearchRepository,
    FtsSearchRepository,
    DomainInferenceService,
    RetrievalService,
    SemanticRerankerService,
    AdaptiveThresholdService,
    RagService,
  ],
  exports: [
    RagService,
    EmbeddingsService,
    SemanticChunkerService,
    RetrievalService,
    DomainInferenceService,
  ],
})
export class AiV2Module {}
