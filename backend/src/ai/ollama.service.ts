import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';
import { buildMedicalOrderPrompt, extractJsonFromResponse, MedicalOrderAnalysis } from './ai.constants';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private readonly ollamaModel = process.env.OLLAMA_MODEL || 'phi3:latest';

  /**
   * Generar respuesta de chat con Ollama
   */
  async generateResponse(
    history: Array<{ role: string; content: string }>,
    newMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage },
    ];

    try {
      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 800,
          },
        }),
      });

      if (!res.ok) {
        throw new InternalServerErrorException(`Ollama API error: ${res.status}`);
      }

      const data: any = await res.json();
      return data?.message?.content || 'Sin respuesta de Ollama.';
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al consultar Ollama: ' + (e instanceof Error ? e.message : e)
      );
    }
  }

  /**
   * Analizar orden médica con Ollama - Extrae datos estructurados de texto OCR
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
          options: {
            temperature: 0.1,
            num_predict: 512,
          },
        }),
      });

      if (!res.ok) {
        throw new InternalServerErrorException(`Ollama API error: ${res.status}`);
      }

      const data: any = await res.json();
      const responseText = data.response || '{}';

      return extractJsonFromResponse(responseText);
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al analizar orden médica con Ollama: ' +
          (e instanceof Error ? e.message : e)
      );
    }
  }
}
