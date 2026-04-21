import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { RateLimitError, LlmCallOptions } from './groq.service';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-3-mini';
const DEFAULT_TIMEOUT_MS = 20_000;
const RATE_LIMIT_STATUSES = new Set([429, 413]);

@Injectable()
export class XAIService {
  private readonly logger = new Logger(XAIService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get<string>('XAI_API_KEY', '');
    if (this.apiKey) this.logger.log('XAIService: key configurada (grok-3-mini)');
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
      throw new RateLimitError('XAI_API_KEY no configurada');
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
      const res = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: XAI_MODEL, messages, max_tokens: maxTokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (RATE_LIMIT_STATUSES.has(res.status)) {
          throw new RateLimitError(`xAI 429: ${JSON.stringify(errData)}`);
        }
        throw new RateLimitError(`xAI API error: ${res.status} - ${JSON.stringify(errData)}`);
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sin respuesta de xAI.';
    } catch (e) {
      if (e instanceof RateLimitError) throw e;
      throw new RateLimitError(e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timer);
    }
  }
}
