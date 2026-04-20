import { Injectable } from '@nestjs/common';
import { AiConfig } from '../../config/ai.config';
import { withTimeout } from '../../shared/result';
import {
  ChatMessage,
  GenerateOptions,
  LlmProvider,
} from '../llm.interface';

@Injectable()
export class OllamaLlmProvider implements LlmProvider {
  readonly name = 'ollama';
  constructor(private readonly cfg: AiConfig) {}

  async healthy(): Promise<boolean> {
    try {
      const res = await withTimeout(
        fetch(`${this.cfg.ollamaHost}/api/tags`),
        1500,
        'ollama-llm-health',
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    const body = this.body(messages, opts, false);
    const res = await withTimeout(
      fetch(`${this.cfg.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      }),
      opts.timeoutMs ?? 30000,
      'ollama-chat',
    );
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const j = (await res.json()) as { message?: { content?: string } };
    return j.message?.content ?? '';
  }

  async *stream(
    messages: ChatMessage[],
    opts: GenerateOptions,
  ): AsyncIterable<string> {
    const body = this.body(messages, opts, true);
    const res = await withTimeout(
      fetch(`${this.cfg.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      }),
      opts.timeoutMs ?? 30000,
      'ollama-chat-stream',
    );
    if (!res.ok || !res.body) throw new Error(`ollama ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          const piece = j.message?.content ?? '';
          if (piece) yield piece;
          if (j.done) return;
        } catch {
          /* partial */
        }
      }
    }
  }

  private body(messages: ChatMessage[], opts: GenerateOptions, stream: boolean) {
    return {
      model: this.cfg.ollamaLlmModel,
      messages,
      stream,
      options: {
        temperature: opts.temperature ?? 0.4,
        num_predict: opts.maxTokens ?? 800,
      },
      format: opts.responseFormat === 'json' ? 'json' : undefined,
    };
  }
}
