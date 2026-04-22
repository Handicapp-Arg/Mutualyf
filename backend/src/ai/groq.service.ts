import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

const DEFAULT_TIMEOUT_MS = 15_000;

/** Modelo principal para respuestas de chat (alta calidad). */
const GROQ_CHAT_MODEL = 'llama-3.3-70b-versatile';

/** Modelo ligero para clasificación (LLM judge, ~6 tokens output). */
export const GROQ_JUDGE_MODEL = 'llama-3.1-8b-instant';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_STATUSES = new Set([429, 413]);

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface LlmCallOptions {
  timeoutMs?: number;
  /** Sobreescribe el modelo para este call específico (ej: judge usa 8b, chat usa 70b). */
  model?: string;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly keys: string[];

  constructor(private readonly configService: ConfigService) {
    this.keys = [
      configService.get<string>('GROQ_API_KEY', ''),
      configService.get<string>('GROQ_API_KEY_2', ''),
    ].filter(Boolean);

    this.logger.log(`GroqService: ${this.keys.length} key(s) configurada(s), chat=${GROQ_CHAT_MODEL}`);
  }

  get available(): boolean {
    return this.keys.length > 0;
  }

  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
    opts: LlmCallOptions = {},
  ): Promise<string> {
    if (!this.available) {
      throw new RateLimitError('No hay keys de Groq configuradas');
    }

    const model = opts.model ?? GROQ_CHAT_MODEL;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let lastError: Error = new Error('unknown');

    for (const key of this.keys) {
      try {
        return await this.callGroq(key, history, newMessage, systemPrompt, temperature, maxTokens, timeoutMs, model);
      } catch (e) {
        lastError = e as Error;
        if (e instanceof RateLimitError) {
          this.logger.warn(`Groq key ${this.maskKey(key)} rate-limited — probando siguiente key`);
          continue;
        }
        throw e;
      }
    }

    throw new RateLimitError(`Todas las keys de Groq agotadas: ${lastError.message}`);
  }

  private async callGroq(
    apiKey: string,
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature: number,
    maxTokens: number,
    timeoutMs: number,
    model: string,
  ): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (RATE_LIMIT_STATUSES.has(res.status)) {
          throw new RateLimitError(`Groq 429: ${JSON.stringify(errData)}`);
        }
        throw new InternalServerErrorException(`Groq API error: ${res.status} - ${JSON.stringify(errData)}`);
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sin respuesta de Groq.';
    } catch (e) {
      if (e instanceof InternalServerErrorException || e instanceof RateLimitError) throw e;
      throw new RateLimitError(e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timer);
    }
  }

  private maskKey(key: string): string {
    return key.slice(0, 8) + '...';
  }
}
