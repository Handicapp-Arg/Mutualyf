import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { RateLimitError } from './groq.service';

const GEMINI_TIMEOUT_MS = 20_000;

const RATE_LIMIT_STATUSES = new Set([429, 413, 503]);

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly keys: string[];

  constructor(private readonly configService: ConfigService) {
    const k1 = this.configService.get<string>('GEMINI_API_KEY', '');
    const k2 = this.configService.get<string>('GEMINI_API_KEY_2', '');
    this.keys = [k1, k2].filter(Boolean);
    if (this.keys.length) this.logger.log(`GeminiService: ${this.keys.length} key(s) configurada(s) (gemini-2.5-flash)`);
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
  ): Promise<string> {
    if (!this.available) {
      throw new RateLimitError('GEMINI_API_KEY no configurada');
    }

    const contents = [
      ...(systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Entendido. Soy el asistente virtual de Mutual Luz y Fuerza. ¿En qué puedo ayudarte?' }] }] : []),
      ...history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: newMessage }] },
    ];

    let lastErr: Error | null = null;
    for (const key of this.keys) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const err = new RateLimitError(`Gemini API error: ${res.status} - ${JSON.stringify(errData)}`);
          if (RATE_LIMIT_STATUSES.has(res.status) && this.keys.indexOf(key) < this.keys.length - 1) {
            lastErr = err;
            this.logger.warn(`Gemini key[${this.keys.indexOf(key)}] rate limited, intentando siguiente key`);
            continue;
          }
          throw err;
        }

        const data: any = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta de Gemini.';
      } catch (e) {
        if (e instanceof RateLimitError) {
          lastErr = e;
          continue;
        }
        throw new RateLimitError('Error al consultar Gemini: ' + (e instanceof Error ? e.message : e));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr ?? new RateLimitError('Todas las keys de Gemini fallaron');
  }
}
