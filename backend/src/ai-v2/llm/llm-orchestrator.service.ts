import { Injectable, Logger } from '@nestjs/common';
import { AiConfig } from '../config/ai.config';
import { ChatMessage, GenerateOptions, LlmProvider } from './llm.interface';
import { GroqProvider } from './providers/groq.provider';
import { GeminiLlmProvider } from './providers/gemini.provider';
import { OllamaLlmProvider } from './providers/ollama.provider';

interface Breaker {
  failures: number;
  openedAt: number;
}

@Injectable()
export class LlmOrchestrator {
  private readonly log = new Logger(LlmOrchestrator.name);
  private readonly providers: LlmProvider[];
  private readonly breakers = new Map<string, Breaker>();

  constructor(
    private readonly cfg: AiConfig,
    groq: GroqProvider,
    gemini: GeminiLlmProvider,
    ollama: OllamaLlmProvider,
  ) {
    this.providers = [groq, gemini, ollama];
  }

  private isOpen(name: string): boolean {
    const b = this.breakers.get(name);
    if (!b) return false;
    if (b.failures < this.cfg.circuitBreakerThreshold) return false;
    if (Date.now() - b.openedAt > this.cfg.circuitBreakerCooldownMs) {
      this.breakers.delete(name);
      return false;
    }
    return true;
  }

  private recordFailure(name: string): void {
    const b = this.breakers.get(name) ?? { failures: 0, openedAt: 0 };
    b.failures += 1;
    b.openedAt = Date.now();
    this.breakers.set(name, b);
  }

  private recordSuccess(name: string): void {
    this.breakers.delete(name);
  }

  async generate(
    messages: ChatMessage[],
    opts: GenerateOptions = {},
  ): Promise<string> {
    let lastErr: unknown;
    for (const p of this.providers) {
      if (this.isOpen(p.name)) continue;
      try {
        const out = await p.generate(messages, opts);
        this.recordSuccess(p.name);
        return out;
      } catch (e) {
        this.recordFailure(p.name);
        lastErr = e;
        this.log.warn(`llm ${p.name} generate failed: ${String(e)}`);
      }
    }
    throw lastErr ?? new Error('all llm providers failed');
  }

  async *stream(
    messages: ChatMessage[],
    opts: GenerateOptions = {},
  ): AsyncIterable<string> {
    let lastErr: unknown;
    for (const p of this.providers) {
      if (this.isOpen(p.name)) continue;
      try {
        let any = false;
        for await (const chunk of p.stream(messages, opts)) {
          any = true;
          yield chunk;
        }
        if (any) {
          this.recordSuccess(p.name);
          return;
        }
        throw new Error(`${p.name} produced no tokens`);
      } catch (e) {
        this.recordFailure(p.name);
        lastErr = e;
        this.log.warn(`llm ${p.name} stream failed: ${String(e)}`);
      }
    }
    throw lastErr ?? new Error('all llm providers failed');
  }
}
