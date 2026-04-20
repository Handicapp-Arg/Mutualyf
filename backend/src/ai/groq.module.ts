import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqService } from './groq.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ConfigModule],
  providers: [GroqService, GeminiService],
  exports: [GroqService],
})
export class GroqModule {}
