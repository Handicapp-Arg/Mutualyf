import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

const DEFAULT_TIMEOUT_MS = 15_000;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_STATUSES = new Set([429, 413]);

export class RateLimitError extends Error {
  constructor(
    message: string,
    /** segundos que Groq pide esperar según el header Retry-After */
    public readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface LlmCallOptions {
  timeoutMs?: number;
  /**
   * Si true, ante un 429 espera el tiempo indicado por Retry-After (máx maxRateLimitWaitMs)
   * y reintenta una vez. Útil en ingesta background donde la latencia no importa.
   */
  waitOnRateLimit?: boolean;
  /** Máximo ms que se esperará ante un 429 (default 60 000). */
  maxRateLimitWaitMs?: number;
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

    this.logger.log(`GroqService: ${this.keys.length} key(s) configurada(s)`);
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

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxWait = opts.maxRateLimitWaitMs ?? 60_000;
    let lastError: Error & { retryAfterSec?: number } = new Error('unknown');

    for (const key of this.keys) {
      try {
        return await this.callGroq(key, history, newMessage, systemPrompt, temperature, maxTokens, timeoutMs);
      } catch (e) {
        lastError = e as Error & { retryAfterSec?: number };
        if (e instanceof RateLimitError) {
          this.logger.warn(`Groq key ${this.maskKey(key)} rate-limited — probando siguiente key`);
          continue;
        }
        throw e;
      }
    }

    // Todas las keys agotadas. Si waitOnRateLimit, esperamos y reintentamos una vez.
    if (opts.waitOnRateLimit) {
      const waitMs = Math.min(
        ((lastError as RateLimitError).retryAfterSec ?? 45) * 1000,
        maxWait,
      );
      this.logger.warn(`Groq rate-limit en todas las keys — esperando ${waitMs}ms antes de reintentar`);
      await new Promise((r) => setTimeout(r, waitMs));

      for (const key of this.keys) {
        try {
          return await this.callGroq(key, history, newMessage, systemPrompt, temperature, maxTokens, timeoutMs);
        } catch (e) {
          lastError = e as Error & { retryAfterSec?: number };
          if (e instanceof RateLimitError) continue;
          throw e;
        }
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
        body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (RATE_LIMIT_STATUSES.has(res.status)) {
          const retryAfter = res.headers.get('retry-after');
          const retryAfterSec = retryAfter ? parseFloat(retryAfter) : undefined;
          throw new RateLimitError(`Groq 429: ${JSON.stringify(errData)}`, retryAfterSec);
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
