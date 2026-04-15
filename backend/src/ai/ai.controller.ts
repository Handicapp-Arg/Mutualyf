import { Controller, Post, Body, Res, Logger, OnModuleInit } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';
import { OllamaService } from './ollama.service';
import { ChatRequestDto } from './dto/ai.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AiConfigService } from '../ai-config/ai-config.service';
import { QuickReplyService } from '../quick-reply/quick-reply.service';
import { MAX_HISTORY_MESSAGES, MUTUALYF_KEYWORDS, OFF_TOPIC_RESPONSE } from './ai.constants';
import { setupSSE, writeSSEChunked } from './utils/sse.util';

/** Mensaje de fallback final con datos de contacto reales de MutuaLyF */
const FALLBACK_RESPONSE =
  'Estamos teniendo dificultades técnicas en este momento. Para asistencia inmediata podés contactarnos:\n\n📞 0800 777 4413 (Lunes a viernes de 07:30 a 19:30 hs)\n💻 Plataforma MiMutuaLyF (disponible 24hs)\n\nDisculpá las molestias, intentá de nuevo en unos segundos.';

@Public()
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('ai')
export class AiController implements OnModuleInit {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly groqService: GroqService,
    private readonly ollamaService: OllamaService,
    private readonly aiConfigService: AiConfigService,
    private readonly quickReplyService: QuickReplyService,
  ) {}

  async onModuleInit() {
    const config = this.aiConfigService.getConfig();
    this.ollamaService.warmup(config.systemPrompt).catch(() => {});
  }

  /**
   * Construye el system prompt inyectando la instrucción de longitud.
   * El maxTokens configurado se traduce a una guía para la IA,
   * y el límite real de la API se aumenta para dar margen a terminar oraciones.
   */
  private buildPromptWithLength(basePrompt: string, maxTokens: number): {
    prompt: string;
    apiMaxTokens: number;
  } {
    const lengthHint = `\n\nIMPORTANTE SOBRE LA EXTENSIÓN DE TUS RESPUESTAS: Mantené tus respuestas en aproximadamente ${maxTokens} tokens (unas ${Math.round(maxTokens * 0.75)} palabras). Sé conciso y directo. Si necesitás resumir, priorizá la información más relevante. NUNCA dejes una oración incompleta: si estás llegando al límite, cerrá la idea con una oración final coherente.`;
    return {
      prompt: basePrompt + lengthHint,
      apiMaxTokens: Math.min(maxTokens + 150, 4096),
    };
  }

  /**
   * Detecta si un mensaje es claramente off-topic (no relacionado con MutuaLyF).
   * Mensajes cortos (<=3 palabras) se dejan pasar a Ollama por ambigüedad.
   * Mensajes largos sin ninguna keyword se rechazan inmediatamente.
   */
  private isOffTopic(message: string): boolean {
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length <= 3) return false;

    return !MUTUALYF_KEYWORDS.some((kw) => normalized.includes(kw));
  }

  /**
   * Endpoint unificado — cascada:
   * QuickReply → OffTopic → Ollama (streaming) → Ollama retry → Groq → Fallback
   */
  @Post('chat')
  async chat(@Body() body: ChatRequestDto, @Res() res: Response) {
    setupSSE(res);

    const config = this.aiConfigService.getConfig();
    const history = (body.history || []).slice(-MAX_HISTORY_MESSAGES);
    const failures: Array<{ stage: string; message: string }> = [];

    try {
      // 1. Quick reply — instantáneo, 0ms, sin IA
      const quickReply = this.quickReplyService.match(body.newMessage);
      if (quickReply) {
        writeSSEChunked(res, quickReply);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 2. Off-topic guard — rechaza preguntas claramente fuera de tema sin gastar tokens
      if (this.isOffTopic(body.newMessage)) {
        writeSSEChunked(res, OFF_TOPIC_RESPONSE);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 3. Ollama (self-hosted) — streaming real con early-stop
      const { prompt, apiMaxTokens } = this.buildPromptWithLength(config.systemPrompt, config.maxTokens);
      try {
        let hasContent = false;
        let accumulated = '';
        for await (const chunk of this.ollamaService.generateResponseStream(
          history,
          body.newMessage,
          prompt,
          config.temperature,
          apiMaxTokens,
        )) {
          hasContent = true;
          accumulated += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);

          // Early stop: detección de basura de phi3
          if (accumulated.includes('\n---') || accumulated.includes('\n\n\n')) {
            break;
          }
        }

        if (hasContent) {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Ollama streaming failed: ${message}`);
        failures.push({ stage: 'ollama-stream', message });
      }

      // 4. Ollama retry sin streaming
      try {
        this.logger.log('Retrying Ollama without streaming...');
        const response = await this.ollamaService.generateResponse(
          history,
          body.newMessage,
          prompt,
          config.temperature,
          apiMaxTokens,
        );
        if (response && response !== 'Sin respuesta de Ollama.') {
          writeSSEChunked(res, response);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Ollama retry failed: ${message}`);
        failures.push({ stage: 'ollama-retry', message });
      }

      // 5. Groq fallback — API externa
      try {
        this.logger.log('Falling back to Groq...');
        const response = await this.groqService.generateResponse(
          history,
          body.newMessage,
          prompt,
          config.temperature,
          apiMaxTokens,
        );
        if (response) {
          writeSSEChunked(res, response);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Groq fallback failed: ${message}`);
        failures.push({ stage: 'groq', message });
      }

      // 6. Fallback final con info de contacto + diagnóstico para la consola del front
      if (failures.length > 0) {
        res.write(`data: ${JSON.stringify({ warning: 'ai-cascade-failed', failures })}\n\n`);
      }
      writeSSEChunked(res, FALLBACK_RESPONSE);
      res.write('data: [DONE]\n\n');
    } catch (e) {
      this.logger.error(`Chat fatal error: ${e instanceof Error ? e.message : e}`);
      res.write(`data: ${JSON.stringify({ error: 'Error interno' })}\n\n`);
      res.write('data: [DONE]\n\n');
    }

    res.end();
  }

  // Endpoints individuales para testing/admin
  @Post('ollama')
  async ollama(@Body() body: ChatRequestDto, @Res() res: Response) {
    const config = this.aiConfigService.getConfig();
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(config.systemPrompt, config.maxTokens);
    setupSSE(res);

    try {
      for await (const chunk of this.ollamaService.generateResponseStream(
        (body.history || []).slice(-MAX_HISTORY_MESSAGES),
        body.newMessage,
        prompt,
        config.temperature,
        apiMaxTokens,
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
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(config.systemPrompt, config.maxTokens);
    const response = await this.groqService.generateResponse(
      (body.history || []).slice(-MAX_HISTORY_MESSAGES),
      body.newMessage,
      prompt,
      config.temperature,
      apiMaxTokens,
    );
    return { response };
  }

  @Post('gemini')
  async gemini(@Body() body: ChatRequestDto) {
    const config = this.aiConfigService.getConfig();
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(config.systemPrompt, config.maxTokens);
    const response = await this.geminiService.generateResponse(
      (body.history || []).slice(-MAX_HISTORY_MESSAGES),
      body.newMessage,
      prompt,
      config.temperature,
      apiMaxTokens,
    );
    return { response };
  }
}
