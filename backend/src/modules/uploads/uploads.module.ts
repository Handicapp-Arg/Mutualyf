import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { OCRService } from './ocr.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OllamaService } from '../../ai/ollama.service';
import { GeminiService } from '../../ai/gemini.service';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsService, OCRService, OllamaService, GeminiService],
  exports: [UploadsService],
})
export class UploadsModule {}
