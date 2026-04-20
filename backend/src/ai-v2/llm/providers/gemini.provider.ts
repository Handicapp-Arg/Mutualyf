import { Injectable } from '@nestjs/common';
import { AiConfig } from '../../config/ai.config';
import { withTimeout } from '../../shared/result';
import {
  ChatMessage,
  GenerateOptions,
  LlmProvider,
} from '../llm.interface';

function toContents(messages: ChatMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
} {
  const sys = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  return {
    systemInstruction: sys.length
      ? { parts: [{ text: sys.map((s) => s.content).join('\n\n') }] }
      : undefined,
    contents: rest.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  };
}

@Injectable()
export class GeminiLlmProvider implements LlmProvider {
  readonly name = 'gemini';
  constructor(private readonly cfg: AiConfig) {}

  async healthy(): Promise<boolean> {
    return Boolean(this.cfg.geminiKey);
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    const { systemInstruction, contents } = toContents(messages);
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.cfg.geminiLlmModel}:generateContent?key=${this.cfg.geminiKey}`;
    const body: Record<string, unknown> = {
      contents,
      systemInstruction,
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 800,
        responseMimeType:
          opts.responseFormat === 'json' ? 'application/json' : undefined,
      },
    };
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      }),
      opts.timeoutMs ?? 20000,
      'gemini',
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const j = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  }

  async *stream(
    messages: ChatMessage[],
    opts: GenerateOptions,
  ): AsyncIterable<string> {
    const { systemInstruction, contents } = toContents(messages);
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.cfg.geminiLlmModel}:streamGenerateContent?alt=sse&key=${this.cfg.geminiKey}`;
    const body: Record<string, unknown> = {
      contents,
      systemInstruction,
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 800,
      },
    };
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      }),
      opts.timeoutMs ?? 20000,
      'gemini-stream',
    );
    if (!res.ok || !res.body) throw new Error(`gemini ${res.status}`);
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
        try {
          const j = JSON.parse(trimmed.slice(5).trim());
          const text =
            j?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? '')
              .join('') ?? '';
          if (text) yield text;
        } catch {
          /* partial */
        }
      }
    }
  }
}
