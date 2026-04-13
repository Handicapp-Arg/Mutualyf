import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class GroqService {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY', '');
  }

  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Groq API key not configured');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: newMessage },
    ];

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new InternalServerErrorException(
          `Groq API error: ${res.status} - ${JSON.stringify(errData)}`,
        );
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sin respuesta de Groq.';
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new InternalServerErrorException(
        'Error al consultar Groq: ' + (e instanceof Error ? e.message : e),
      );
    }
  }
}
