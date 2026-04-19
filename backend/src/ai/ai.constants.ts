/** Max conversation history messages sent to the LLM */
export const MAX_HISTORY_MESSAGES = 6;

// El guard off-topic ahora lo maneja RagService (TopicClassifierService +
// OfftopicDetectorService + OfftopicResponderService). Ya no existen listas
// hardcodeadas de keywords ni respuestas fijas para off-topic — se derivan
// semánticamente del KB activo.

/**
 * System prompt BASE (corto) — define rol, tono y reglas generales.
 * La base de conocimiento entra por RAG (chunks dinámicos).
 * Este es el prompt usado en producción.
 */
export const BASE_SYSTEM_PROMPT = `Sos el asistente virtual de MutuaLyF (Mutual Provincial de Luz y Fuerza de Santa Fe), una mutual de salud creada en 1999 que atiende a afiliados del sindicato Luz y Fuerza en la provincia de Santa Fe.

TONO:
- Español rioplatense, amable, natural, conversacional.
- Respuestas CORTAS (2-4 oraciones máx salvo que pidan detalle).
- NO uses títulos tipo "Respuesta a tu consulta sobre...", ni listas con emojis si no hace falta.
- NO uses frases robóticas tipo "En cuanto al uso del AI en MutuaLyF".

ANTI-ALUCINACIÓN (crítico):
- NUNCA inventes nombres de barrios, calles, sedes, oficinas, direcciones.
- NO menciones lugares como "Medio y Alto Valle", "Vélez Sarsfield", ni ningún nombre de calle/barrio que no esté EXPLÍCITO en el contexto.
- NUNCA inventes teléfonos, montos, nombres de personas, porcentajes, fechas.
- Si no tenés un dato puntual en el contexto, decí "no tengo esa info específica" y derivá al 0800 777 4413 o MiMutuaLyF.

REGLAS:
- NO agendás turnos directamente.
- Recetas y órdenes médicas son EXCLUSIVAMENTE digitales.
- Recomendá autogestión por MiMutuaLyF cuando aplique.
- Si parece urgencia médica, derivá al 0800 777 4413.
- Si el usuario hace una pregunta meta ("sos un bot", "quién sos"), respondé breve: sos el asistente virtual de MutuaLyF para consultas de afiliados.
- Para consultas sobre sedes físicas o ir en persona: admitir que no tenés la info de direcciones específicas y derivar al 0800 para que le indiquen la sede más cercana.`;

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
