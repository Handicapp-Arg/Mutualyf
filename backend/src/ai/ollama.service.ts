import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { buildMedicalOrderPrompt, extractJsonFromResponse, MedicalOrderAnalysis } from './ai.constants';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL', 'phi3:latest');
  }

  /**
   * Generar respuesta completa (sin streaming)
   */
  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
  ): Promise<string> {
    const messages = this.buildMessages(history, newMessage, systemPrompt);

    const res = await this.callOllama(messages, temperature, maxTokens, false);
    const data: any = await res.json();
    return data?.message?.content || 'Sin respuesta de Ollama.';
  }

  /**
   * Streaming real: genera chunks de texto via async generator
   */
  async *generateResponseStream(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
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

    // procesar lo que quede en el buffer
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

  /**
   * Analizar orden médica con Ollama
   */
  async analyzeMedicalOrder(ocrText: string): Promise<MedicalOrderAnalysis> {
    const prompt = buildMedicalOrderPrompt(ocrText);

    try {
      const res = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: { temperature: 0.1, num_predict: 512 },
        }),
      });

      if (!res.ok) {
        throw new InternalServerErrorException(`Ollama API error: ${res.status}`);
      }

      const data: any = await res.json();
      return extractJsonFromResponse(data.response || '{}');
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new InternalServerErrorException(
        'Error al analizar orden médica con Ollama: ' + (e instanceof Error ? e.message : e),
      );
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
    try {
      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream,
          options: { temperature, num_predict: maxTokens },
        }),
      });

      if (!res.ok) {
        throw new InternalServerErrorException(`Ollama API error: ${res.status}`);
      }

      return res;
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new InternalServerErrorException(
        'Error al consultar Ollama: ' + (e instanceof Error ? e.message : e),
      );
    }
  }
}
