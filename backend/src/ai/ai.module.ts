import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';
import { OllamaService } from './ollama.service';
import { GroqService } from './groq.service';
import { AiConfigModule } from '../ai-config/ai-config.module';
import { QuickReplyModule } from '../quick-reply/quick-reply.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AiConfigModule, QuickReplyModule, RagModule],
  controllers: [AiController],
  providers: [GeminiService, OllamaService, GroqService],
  exports: [OllamaService, GeminiService],
})
export class AiModule {}
