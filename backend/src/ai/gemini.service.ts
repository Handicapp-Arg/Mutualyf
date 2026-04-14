import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { buildMedicalOrderPrompt, extractJsonFromResponse, MedicalOrderAnalysis } from './ai.constants';

@Injectable()
export class GeminiService {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
  }

  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt: string,
    temperature = 0.7,
    maxTokens = 800,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Gemini API key not configured');
    }

    const contents = [
      ...(systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Entendido. Soy el asistente virtual de Mutual Luz y Fuerza. ¿En qué puedo ayudarte?' }] }] : []),
      ...history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: newMessage }] },
    ];

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new InternalServerErrorException(
          `Gemini API error: ${res.status} - ${JSON.stringify(errData)}`,
        );
      }

      const data: any = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta de Gemini.';
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new InternalServerErrorException(
        'Error al consultar Gemini: ' + (e instanceof Error ? e.message : e),
      );
    }
  }

  /**
   * Analizar orden médica con IA - Extrae datos estructurados de texto OCR
   */
  async analyzeMedicalOrder(ocrText: string): Promise<MedicalOrderAnalysis> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Gemini API key not configured');
    }

    const prompt = buildMedicalOrderPrompt(ocrText);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!res.ok) {
        throw new InternalServerErrorException(`Gemini API error: ${res.status}`);
      }

      const data = await res.json();
      const candidates = (data as any)?.candidates;
      const responseText =
        candidates && Array.isArray(candidates) && candidates[0]?.content?.parts?.[0]?.text
          ? candidates[0].content.parts[0].text
          : '{}';

      return extractJsonFromResponse(responseText);
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al analizar orden médica con Gemini: ' +
          (e instanceof Error ? e.message : e)
      );
    }
  }
}
