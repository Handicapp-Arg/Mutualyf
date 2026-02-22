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
        'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' +
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

  /**
   * Analizar orden médica con IA - Extrae datos estructurados de texto OCR
   * Sistema robusto con múltiples intentos de parsing
   */
  async analyzeMedicalOrder(ocrText: string): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('Gemini API key not configured');

    const prompt = `Eres un experto en análisis de órdenes médicas argentinas. Analiza el siguiente texto extraído por OCR de una orden médica y extrae ÚNICAMENTE los siguientes datos en formato JSON estricto.

IMPORTANTE: El texto puede tener errores de OCR, letras mal leídas, o escritura manuscrita. Usa tu conocimiento contextual para corregir errores comunes y hacer inferencias inteligentes.

Texto OCR:
"""
${ocrText}
"""

Debes extraer EXACTAMENTE estos campos en formato JSON:
{
  "patientDNI": "número de DNI de 7-8 dígitos (solo números)",
  "patientName": "nombre completo del paciente (corregido si hay errores de OCR)",
  "orderDate": "fecha en formato YYYY-MM-DD",
  "doctorName": "nombre del médico solicitante",
  "doctorLicense": "matrícula o número de licencia médica",
  "healthInsurance": "obra social o prepaga (OSDE, IOMA, Swiss Medical, etc)",
  "requestedStudies": ["lista", "de", "estudios", "solicitados"]
}

Reglas importantes:
1. Si un campo no está presente o no lo puedes determinar con confianza, usa una cadena vacía "" o array vacío []
2. Para el DNI: busca números de 7-8 dígitos, descarta teléfonos
3. Para nombres: corrige errores comunes de OCR (0→O, 1→I, 5→S, etc)
4. Para fechas: convierte cualquier formato a YYYY-MM-DD
5. Para estudios: lista cada estudio por separado (ej: ["Radiografía de tórax", "Hemograma completo"])
6. NO agregues explicaciones, SOLO el JSON válido

JSON:`;

    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' +
          apiKey,
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
      let responseText =
        candidates && Array.isArray(candidates) && candidates[0]?.content?.parts?.[0]?.text
          ? candidates[0].content.parts[0].text
          : '{}';

      // Log para debugging
      console.log('📥 Respuesta completa de Gemini:', responseText);

      // Sistema robusto de extracción de JSON
      // Paso 1: Limpiar markdown y caracteres especiales
      responseText = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      console.log('🧹 Texto limpio:', responseText.substring(0, 300));

      // Paso 2: Buscar objeto JSON completo
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON. Texto completo:', responseText);
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      console.log('✅ JSON encontrado:', jsonMatch[0].substring(0, 200));

      // Paso 3: Parsear y validar
      const parsedData = JSON.parse(jsonMatch[0]);

      // Validar que tenga la estructura esperada
      if (typeof parsedData !== 'object') {
        throw new Error('Respuesta no es un objeto JSON válido');
      }

      return parsedData;
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al analizar orden médica con Gemini: ' +
          (e instanceof Error ? e.message : e)
      );
    }
  }
}
