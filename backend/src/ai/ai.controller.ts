import { Controller, Post, Body, Res, Logger, OnModuleInit } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';
import { XAIService } from './xai.service';
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

/** Turnos consecutivos sin contexto antes de ofrecer asesor humano */
const UNRESOLVED_THRESHOLD = 2;

@Public()
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('ai')
export class AiController implements OnModuleInit {
  private readonly logger = new Logger(AiController.name);
  /** Turnos consecutivos sin chunks por sessionId */
  private readonly unresolvedCounts = new Map<string, number>();
  /** Sesiones a las que ya se les ofreció asesor (no repetir) */
  private readonly offeredSessions = new Set<string>();

  constructor(
    private readonly groqService: GroqService,
    private readonly xaiService: XAIService,
    private readonly geminiService: GeminiService,
    private readonly ollamaService: OllamaService,
    private readonly aiConfigService: AiConfigService,
    private readonly quickReplyService: QuickReplyService,
    private readonly ragService: RagService,
  ) {}

  async onModuleInit() {
    const config = this.aiConfigService.getConfig();
    this.ollamaService.warmup(this.aiConfigService.assemblePrompt()).catch(() => {});
  }

  /**
   * Construye el system prompt inyectando la instrucción de longitud.
   * El maxTokens configurado se traduce a una guía para la IA,
   * y el límite real de la API se aumenta para dar margen a terminar oraciones.
   */
  private endSSE(res: Response, suggestHuman = false) {
    if (suggestHuman) res.write(`data: ${JSON.stringify({ suggestHuman: true })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }

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
   * Cascada de providers: QuickReply → RAG → Groq (key1+key2) → xAI → Gemini → Ollama → Fallback
   * Cada provider lanza RateLimitError en 429/timeout para pasar al siguiente.
   */
  @Post('chat')
  async chat(@Body() body: ChatRequestDto, @Res() res: Response) {
    setupSSE(res);

    const config = this.aiConfigService.getConfig();
    const history = (body.history || []).slice(-MAX_HISTORY_MESSAGES);
    const failures: Array<{ stage: string; message: string }> = [];

    try {
      // 1. Quick reply — sin IA, instantáneo
      const quickReply = this.quickReplyService.match(body.newMessage);
      if (quickReply) {
        writeSSEChunked(res, quickReply);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 2. RAG — clasificador semántico + retrieval + off-topic contextual
      const rag = await this.ragService.prepare({
        query: body.newMessage,
        history,
        basePrompt: this.aiConfigService.assemblePrompt(),
        ragGrounding: this.aiConfigService.getConfig().ragGrounding,
        sessionId: body.sessionId,
      });

      if (rag.shortCircuit) {
        writeSSEChunked(res, rag.shortCircuit);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Rastrear turnos sin contexto para ofrecer asesor humano
      const sessionId = body.sessionId;
      const topScore = rag.retrieval?.topScore ?? 0;
      const chunksFound = (rag.retrieval?.chunks?.length ?? 0) > 0 && topScore >= 0.30;
      let suggestHuman = false;
      if (sessionId) {
        if (chunksFound) {
          this.unresolvedCounts.delete(sessionId);
        } else {
          const prev = this.unresolvedCounts.get(sessionId) ?? 0;
          const next = prev + 1;
          this.unresolvedCounts.set(sessionId, next);
          if (next >= UNRESOLVED_THRESHOLD && !this.offeredSessions.has(sessionId)) {
            suggestHuman = true;
            this.offeredSessions.add(sessionId);
          }
        }
      }

      const { prompt, apiMaxTokens } = this.buildPromptWithLength(rag.systemPrompt, config.maxTokens);
      const args = [history, body.newMessage, prompt, config.temperature, apiMaxTokens] as const;

      // 3. Groq — primario, pool de 2 keys (failover interno entre key1/key2)
      try {
        writeSSEChunked(res, await this.groqService.generateResponse(...args));
        this.endSSE(res, suggestHuman);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Groq agotado: ${msg}`);
        failures.push({ stage: 'groq', message: msg });
      }

      // 4. Gemini — segundo provider, cuota muy generosa (1M tokens/min free)
      if (this.geminiService.available) {
        try {
          writeSSEChunked(res, await this.geminiService.generateResponse(...args));
          this.endSSE(res, suggestHuman);
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Gemini agotado: ${msg}`);
          failures.push({ stage: 'gemini', message: msg });
        }
      }

      // 5. xAI (Grok) — tercer provider, cuota independiente
      if (this.xaiService.available) {
        try {
          writeSSEChunked(res, await this.xaiService.generateResponse(...args));
          this.endSSE(res, suggestHuman);
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`xAI agotado: ${msg}`);
          failures.push({ stage: 'xai', message: msg });
        }
      }

      // 6. Ollama — local, sin límite de tokens
      try {
        this.logger.log('Fallback a Ollama...');
        let hasContent = false;
        let accumulated = '';
        for await (const chunk of this.ollamaService.generateResponseStream(...args)) {
          hasContent = true;
          accumulated += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          if (accumulated.includes('\n---') || accumulated.includes('\n\n\n')) break;
        }
        if (hasContent) {
          this.endSSE(res, suggestHuman);
          return;
        }
        const response = await this.ollamaService.generateResponse(...args);
        if (response && response !== 'Sin respuesta de Ollama.') {
          writeSSEChunked(res, response);
          this.endSSE(res, suggestHuman);
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Ollama falló: ${msg}`);
        failures.push({ stage: 'ollama', message: msg });
      }

      // 7. Fallback final
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
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(this.aiConfigService.assemblePrompt(), config.maxTokens);
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
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(this.aiConfigService.assemblePrompt(), config.maxTokens);
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
    const { prompt, apiMaxTokens } = this.buildPromptWithLength(this.aiConfigService.assemblePrompt(), config.maxTokens);
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
