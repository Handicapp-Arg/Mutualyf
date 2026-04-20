import { Injectable, InternalServerErrorException, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { GeminiService } from './gemini.service';

const DEFAULT_TIMEOUT_MS = 15_000;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Rate-limit / quota agotada → intentar con Gemini
const RATE_LIMIT_STATUSES = new Set([429, 413]);

export interface GroqCallOptions {
  timeoutMs?: number;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly gemini: GeminiService,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY', '');
  }

  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
    opts: GroqCallOptions = {},
  ): Promise<string> {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (this.apiKey) {
      try {
        return await this.callGroq(history, newMessage, systemPrompt, temperature, maxTokens, timeoutMs);
      } catch (e) {
        const shouldFallback = e instanceof RateLimitError || !(e instanceof InternalServerErrorException);
        if (shouldFallback && this.gemini) {
          this.logger.warn(
            `Groq falló (${(e as Error).message}) — usando Gemini como fallback`,
          );
          return this.gemini.generateResponse(history, newMessage, systemPrompt, temperature, maxTokens);
        }
        throw e;
      }
    }

    if (this.gemini) {
      this.logger.warn('GROQ_API_KEY no configurada — usando Gemini directamente');
      return this.gemini.generateResponse(history, newMessage, systemPrompt, temperature, maxTokens);
    }

    throw new InternalServerErrorException('No hay proveedor LLM disponible (GROQ_API_KEY ni GEMINI_API_KEY configuradas)');
  }

  private async callGroq(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature: number,
    maxTokens: number,
    timeoutMs: number,
  ): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: newMessage },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (RATE_LIMIT_STATUSES.has(res.status)) {
          throw new RateLimitError(`Groq rate-limit: ${res.status}`);
        }
        throw new InternalServerErrorException(
          `Groq API error: ${res.status} - ${JSON.stringify(errData)}`,
        );
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sin respuesta de Groq.';
    } catch (e) {
      if (e instanceof InternalServerErrorException || e instanceof RateLimitError) throw e;
      throw new RateLimitError((e instanceof Error ? e.message : String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
