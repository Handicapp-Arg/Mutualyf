import { Injectable } from '@nestjs/common';
import { AiConfig } from '../../config/ai.config';
import { withTimeout } from '../../shared/result';
import {
  ChatMessage,
  GenerateOptions,
  LlmProvider,
} from '../llm.interface';

@Injectable()
export class GroqProvider implements LlmProvider {
  readonly name = 'groq';
  constructor(private readonly cfg: AiConfig) {}

  async healthy(): Promise<boolean> {
    return Boolean(this.cfg.groqKey);
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    const res = await this.call(messages, opts, false);
    if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return j.choices[0]?.message?.content ?? '';
  }

  async *stream(
    messages: ChatMessage[],
    opts: GenerateOptions,
  ): AsyncIterable<string> {
    const res = await this.call(messages, opts, true);
    if (!res.ok || !res.body) {
      throw new Error(`groq ${res.status}`);
    }
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
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* partial */
        }
      }
    }
  }

  private call(
    messages: ChatMessage[],
    opts: GenerateOptions,
    stream: boolean,
  ) {
    const body: Record<string, unknown> = {
      model: this.cfg.groqModel,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
      stream,
    };
    if (opts.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }
    return withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.groqKey}`,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      }),
      opts.timeoutMs ?? 15000,
      'groq',
    );
  }
}
