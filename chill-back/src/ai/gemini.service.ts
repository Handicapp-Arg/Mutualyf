// Servicio Gemini para NestJS (usa la lógica de chill-front)
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class GeminiService {
  async generateResponse(history: any[], newMessage: string, userName?: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('Gemini API key not configured');

    // Construir el prompt para Gemini
    const prompt = [
      ...history.map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Bot'}: ${msg.content}`),
      userName ? `Usuario (${userName}): ${newMessage}` : `Usuario: ${newMessage}`
    ].join('\n');

    try {
  const res = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        })
      });
      if (!res.ok) {
        let errorMsg = `Gemini API error: ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg += ' - ' + JSON.stringify(errData);
        } catch {}
        throw new InternalServerErrorException(errorMsg);
      }
      const data = await res.json();
      // Gemini responde en data.candidates[0].content.parts[0].text
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta de Gemini.'
      );
    } catch (e) {
      throw new InternalServerErrorException('Error al consultar Gemini: ' + (e instanceof Error ? e.message : e));
    }
  }
}
