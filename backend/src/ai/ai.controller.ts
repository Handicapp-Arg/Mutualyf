import { Controller, Post, Body, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';
import { GeminiService } from './gemini.service';
import { OllamaService } from './ollama.service';
import { ChatRequestDto } from './dto/ai.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AiConfigService } from '../ai-config/ai-config.service';

@Public()
@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly ollamaService: OllamaService,
    private readonly aiConfigService: AiConfigService,
  ) {}

  @Post('gemini')
  async gemini(@Body() body: ChatRequestDto) {
    const response = await this.geminiService.generateResponse(
      body.history || [],
      body.newMessage,
      body.userName,
    );
    return { response };
  }

  @Post('grok')
  async grok(@Body() body: ChatRequestDto) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('Groq API key not configured');

    const config = this.aiConfigService.getConfig();
    const finalSystemPrompt = config.systemPrompt;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: finalSystemPrompt },
            ...(body.history || []).map((msg) => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: body.newMessage },
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });
      if (!res.ok) {
        let errorMsg = `Groq API error: ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg += ' - ' + JSON.stringify(errData);
        } catch {}
        throw new InternalServerErrorException(errorMsg);
      }
      const data = await res.json();
      if (data && typeof data === 'object' && Array.isArray((data as any).choices)) {
        return {
          response:
            (data as any).choices[0]?.message?.content || 'Sin respuesta de Groq.',
        };
      }
      return { response: 'Sin respuesta de Groq.' };
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al consultar Groq: ' + (e instanceof Error ? e.message : e),
      );
    }
  }

  @Post('ollama')
  async ollama(@Body() body: ChatRequestDto) {
    const config = this.aiConfigService.getConfig();
    const response = await this.ollamaService.generateResponse(
      body.history || [],
      body.newMessage,
      config.systemPrompt,
      config.temperature,
      config.maxTokens,
    );
    return { response };
  }
}
