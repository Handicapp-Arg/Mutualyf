/**
 * System prompt por defecto para el asistente Nexus.
 * Usado como fallback si no hay config en DB.
 */
export const DEFAULT_SYSTEM_PROMPT = `Eres el asistente virtual de Mutual Luz y Fuerza.

Sos amable, profesional y conciso. Ayudás a los asociados con consultas generales sobre los servicios de la mutual.

Respondé siempre en español rioplatense. No inventés información que no tengas.`;

/**
 * Prompt compartido para análisis de órdenes médicas por OCR.
 * Usado por GeminiService y OllamaService.
 */
export function buildMedicalOrderPrompt(ocrText: string): string {
  return `Eres un experto en análisis de órdenes médicas argentinas. Analiza el siguiente texto extraído por OCR de una orden médica y extrae ÚNICAMENTE los siguientes datos en formato JSON estricto.

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
}

/**
 * Resultado esperado del análisis de orden médica
 */
export interface MedicalOrderAnalysis {
  patientDNI: string;
  patientName: string;
  orderDate: string;
  doctorName: string;
  doctorLicense: string;
  healthInsurance: string;
  requestedStudies: string[];
}

/**
 * Extrae y parsea JSON de una respuesta de texto de un LLM.
 * Maneja markdown code blocks y texto extra.
 */
export function extractJsonFromResponse(responseText: string): MedicalOrderAnalysis {
  let cleaned = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No se encontró JSON válido en la respuesta');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (typeof parsed !== 'object') {
    throw new Error('Respuesta no es un objeto JSON válido');
  }

  return parsed;
}
