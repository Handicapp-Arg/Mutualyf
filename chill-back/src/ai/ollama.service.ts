import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl = process.env.VITE_OLLAMA_URL || 'http://localhost:11434';
  private readonly ollamaModel = process.env.VITE_OLLAMA_MODEL || 'llama3.1:8b';

  /**
   * Analizar orden médica con Ollama - Extrae datos estructurados de texto OCR
   */
  async analyzeMedicalOrder(ocrText: string): Promise<any> {
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

Responde ÚNICAMENTE con el JSON, sin markdown ni explicaciones:`;

    try {
      const res = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
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

      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(responseText);
    } catch (e) {
      throw new InternalServerErrorException(
        'Error al analizar orden médica con Ollama: ' +
          (e instanceof Error ? e.message : e)
      );
    }
  }
}
