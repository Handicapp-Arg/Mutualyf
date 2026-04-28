import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { RateLimitError, LlmCallOptions } from './groq.service';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 20_000;
const RATE_LIMIT_STATUSES = new Set([429, 413]);

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get<string>('OPENAI_API_KEY', '');
    if (this.apiKey) this.logger.log(`OpenAIService: key configurada (${OPENAI_MODEL})`);
  }

  get available(): boolean {
    return !!this.apiKey;
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
      throw new RateLimitError('OPENAI_API_KEY no configurada');
    }

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens: maxTokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (RATE_LIMIT_STATUSES.has(res.status)) {
          throw new RateLimitError(`OpenAI 429: ${JSON.stringify(errData)}`);
        }
        throw new RateLimitError(`OpenAI API error: ${res.status} - ${JSON.stringify(errData)}`);
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sin respuesta de OpenAI.';
    } catch (e) {
      if (e instanceof RateLimitError) throw e;
      throw new RateLimitError(e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timer);
    }
  }
}
