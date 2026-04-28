import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';
import { XAIService } from './xai.service';
import { OllamaService } from './ollama.service';
import { OpenAIService } from './openai.service';
import { GroqModule } from './groq.module';
import { AiConfigModule } from '../ai-config/ai-config.module';
import { QuickReplyModule } from '../quick-reply/quick-reply.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AiConfigModule, QuickReplyModule, RagModule, GroqModule],
  controllers: [AiController],
  providers: [GeminiService, XAIService, OllamaService, OpenAIService],
  exports: [OllamaService, GeminiService, XAIService, OpenAIService],
})
export class AiModule {}
