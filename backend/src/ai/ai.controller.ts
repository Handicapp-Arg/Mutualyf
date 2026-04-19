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
import { MAX_HISTORY_MESSAGES } from './ai.constants';
import { setupSSE, writeSSEChunked } from './utils/sse.util';
import { RagService } from '../rag/rag.service';

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
    private readonly ragService: RagService,
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
   * Endpoint unificado — cascada:
   * QuickReply → RAG (topic-classifier + retrieval + offtopic semántico) → Groq → Gemini → Ollama (streaming) → Ollama retry → Fallback
   *
   * El guard off-topic lo resuelve íntegramente el RagService:
   *   - TopicClassifierService: similitud semántica vs centroides del KB (+ LLM judge en zona ambigua)
   *   - OfftopicDetectorService: multi-señal sobre el retrieval (vec/FTS/overlap/concentración)
   *   - OfftopicResponderService: respuesta contextual en vez de un string fijo
   * Ya no hay keyword matching hardcodeado.
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

      // 2. RAG — clasificador semántico + retrieval híbrido + off-topic contextual
      const rag = await this.ragService.prepare({
        query: body.newMessage,
        history,
        basePrompt: config.systemPrompt,
        sessionId: (body as any).sessionId,
      });

      if (rag.shortCircuit) {
        writeSSEChunked(res, rag.shortCircuit);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const { prompt, apiMaxTokens } = this.buildPromptWithLength(rag.systemPrompt, config.maxTokens);

      // 3. Groq (primario) — API externa, rápida
      try {
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
        this.logger.warn(`Groq failed: ${message}`);
        failures.push({ stage: 'groq', message });
      }

      // 4. Gemini — API externa, segundo intento
      try {
        this.logger.log('Falling back to Gemini...');
        const response = await this.geminiService.generateResponse(
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
        this.logger.warn(`Gemini failed: ${message}`);
        failures.push({ stage: 'gemini', message });
      }

      // 5. Ollama fallback (self-hosted) — streaming con early-stop
      try {
        this.logger.log('Falling back to Ollama streaming...');
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

      // 6. Ollama retry sin streaming
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

      // 7. Fallback final con info de contacto + diagnóstico para la consola del front
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
