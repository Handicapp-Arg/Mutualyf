// Servicio Gemini para NestJS (usa la lógica de chill-front)
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class GeminiService {
  async generateResponse(
    history: any[],
    newMessage: string,
    userName?: string
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('Gemini API key not configured');

    // Construir el prompt para Gemini
    const prompt = [
      ...history.map(
        (msg) => `${msg.role === 'user' ? 'Usuario' : 'Bot'}: ${msg.content}`
      ),
      userName ? `Usuario (${userName}): ${newMessage}` : `Usuario: ${newMessage}`,
    ].join('\n');

    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' +
          apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      if (!res.ok) {
        let errorMsg = `Gemini API error: ${res.status}`;
        try {
          const errData = await res.json();
          if (res.status === 404) {
            errorMsg =
              '❌ Gemini API: La clave API no es válida o el modelo no está disponible';
          } else if (res.status === 429) {
            errorMsg =
              '⚠️ Gemini API: Se excedió la cuota de requests. Intenta más tarde o verifica tu cuenta en Google AI Studio';
          } else if (res.status === 403) {
            errorMsg =
              '❌ Gemini API: Acceso denegado. Verifica que la API key tenga los permisos necesarios';
          } else {
            errorMsg += ' - ' + JSON.stringify(errData);
          }
        } catch {}
        throw new InternalServerErrorException(errorMsg);
      }
      const data = await res.json();
      // Gemini responde en data.candidates[0].content.parts[0].text
      return data && typeof data === 'object' && Array.isArray((data as any).candidates)
        ? (data as any).candidates[0]?.content?.parts?.[0]?.text ||
            'Sin respuesta de Gemini.'
        : 'Sin respuesta de Gemini.';
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al consultar Gemini: ' + (e instanceof Error ? e.message : e)
      );
    }
  }
}
