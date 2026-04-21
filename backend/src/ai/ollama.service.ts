import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private readonly timeoutMs: number;
  private readonly numCtx: number;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL', 'phi3:latest');
    this.timeoutMs = parseInt(this.configService.get<string>('OLLAMA_TIMEOUT_MS', '30000'), 10);
    this.numCtx = parseInt(this.configService.get<string>('OLLAMA_NUM_CTX', '2048'), 10);
  }

  /**
   * Warmup: pre-carga el modelo y cachea el KV state del system prompt.
   * Ollama guarda el KV cache — si el system prompt es idéntico
   * en requests siguientes, prompt_eval = 0ms.
   */
  async warmup(systemPrompt: string) {
    try {
      this.logger.log('Warming up Ollama KV cache...');
      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'hola' },
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 1, num_ctx: this.numCtx },
        }),
      });

      if (res.ok) {
        this.logger.log('Ollama KV cache ready');
      } else {
        this.logger.warn(`Warmup response: ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Ollama warmup failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 400,
  ): Promise<string> {
    const messages = this.buildMessages(history, newMessage, systemPrompt);
    const res = await this.callOllama(messages, temperature, maxTokens, false);
    const data: any = await res.json();
    return data?.message?.content || 'Sin respuesta de Ollama.';
  }

  async *generateResponseStream(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 400,
  ): AsyncGenerator<string> {
    const messages = this.buildMessages(history, newMessage, systemPrompt);
    const res = await this.callOllama(messages, temperature, maxTokens, true);

    const body = res.body;
    if (!body) throw new InternalServerErrorException('No response body from Ollama');

    let buffer = '';
    for await (const chunk of body) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
        } catch {
          // línea incompleta, ignorar
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.message?.content) {
          yield parsed.message.content;
        }
      } catch {
        // ignorar
      }
    }
  }

  private buildMessages(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
  ) {
    return [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage },
    ];
  }

  private async callOllama(
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    maxTokens: number,
    stream: boolean,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream,
          options: {
            temperature,
            num_predict: maxTokens,
            num_ctx: this.numCtx,
          },
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'no body');
        throw new InternalServerErrorException(`Ollama API error ${res.status}: ${errorBody}`);
      }

      return res;
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof InternalServerErrorException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new InternalServerErrorException(
        msg.includes('abort') ? `Ollama timeout (${this.timeoutMs}ms)` : `Ollama error: ${msg}`,
      );
    }
  }
}
