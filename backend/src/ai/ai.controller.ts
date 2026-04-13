import { Controller, Post, Body, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';
import { OllamaService } from './ollama.service';
import { ChatRequestDto } from './dto/ai.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AiConfigService } from '../ai-config/ai-config.service';

@Public()
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly groqService: GroqService,
    private readonly ollamaService: OllamaService,
    private readonly aiConfigService: AiConfigService,
  ) {}

  @Post('ollama')
  async ollama(@Body() body: ChatRequestDto, @Res() res: Response) {
    const config = this.aiConfigService.getConfig();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.ollamaService.generateResponseStream(
        body.history || [],
        body.newMessage,
        config.systemPrompt,
        config.temperature,
        config.maxTokens,
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'Error de Ollama' })}\n\n`);
    }

    res.end();
  }

  @Post('grok')
  async grok(@Body() body: ChatRequestDto) {
    const config = this.aiConfigService.getConfig();
    const response = await this.groqService.generateResponse(
      body.history || [],
      body.newMessage,
      config.systemPrompt,
      config.temperature,
      config.maxTokens,
    );
    return { response };
  }

  @Post('gemini')
  async gemini(@Body() body: ChatRequestDto) {
    const config = this.aiConfigService.getConfig();
    const response = await this.geminiService.generateResponse(
      body.history || [],
      body.newMessage,
      config.systemPrompt,
      config.temperature,
      config.maxTokens,
    );
    return { response };
  }
}
