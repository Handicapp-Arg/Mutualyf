/**
 * NAME DETECTION SYSTEM
 * =====================
 * Sistema inteligente de detección de nombres usando análisis contextual.
 * 
 * Estrategia:
 * 1. Analizar si el bot PIDIÓ el nombre en el mensaje anterior
 * 2. Evaluar la estructura del mensaje del usuario
 * 3. Aplicar heurísticas de confianza
 * 4. Filtrar falsos positivos
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface NameDetectionResult {
  detected: boolean;
  name: string | null;
  confidence: NameConfidence;
  reason: string;
}

export type NameConfidence = 'high' | 'medium' | 'low' | 'none';

interface DetectionContext {
  userMessage: string;
  previousBotMessage?: string;
  conversationLength?: number;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/** Palabras que NUNCA son nombres */
const BLACKLIST = new Set([
  // Saludos y expresiones
  'hola', 'buenas', 'buenos', 'hey', 'hi', 'hello', 'que', 'tal',
  'como', 'bien', 'gracias', 'dias', 'tardes', 'noches', 'ahi',
  'si', 'no', 'ok', 'vale', 'claro', 'dale', 'genial', 'perfecto',
  
  // Temas del chat
  'stack', 'proyectos', 'contacto', 'experiencia', 'cv', 'curriculum',
  'tecnologias', 'trabajo', 'ingles', 'english', 'frontend', 'backend',
  'react', 'node', 'javascript', 'typescript', 'python', 'java',
  
  // Bot y sistema
  'chill', 'bot', 'asistente', 'chat', 'ia', 'ai', 'modelo', 'lenguaje',
  
  // Verbos y palabras comunes
  'estas', 'estás', 'todo', 'nada', 'algo', 'mucho', 'poco',
  'quiero', 'necesito', 'busco', 'tengo', 'puedo', 'puede',
  'saber', 'conocer', 'ver', 'hablar', 'decir', 'contar',
]);

/** Patrones que indican que el bot PIDIÓ el nombre */
const BOT_ASKED_NAME_PATTERNS = [
  /c[oó]mo te llam/i,
  /cu[aá]l es tu nombre/i,
  /tu nombre/i,
  /quien eres/i,
  /quién eres/i,
  /me dec[ií]s tu nombre/i,
  /present[aá](?:te|rte)/i,
  /\?.*nombre/i,
  /nombre.*\?/i,
];

/** Patrones de presentación explícita (alta confianza) */
const EXPLICIT_INTRO_PATTERNS = [
  /^(?:me llamo|soy|mi nombre es)\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i,
  /^hola[,!]?\s+(?:me llamo|soy)\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i,
  /^(?:hey|hi)[,!]?\s+(?:i'?m|i am|my name is)\s+([A-Za-z]+)/i,
];

/** Patrón para nombre solo (usado cuando hay contexto) */
const SINGLE_WORD_NAME_PATTERN = /^([A-Za-záéíóúñÁÉÍÓÚÑ]{2,20})$/;

// ============================================================================
// DETECTOR PRINCIPAL
// ============================================================================

/**
 * Detecta si el usuario está proporcionando su nombre
 * Usa análisis contextual para mayor precisión
 */
export function detectName(context: DetectionContext): NameDetectionResult {
  const { userMessage, previousBotMessage } = context;
  const message = userMessage.trim();
  
  // 1. DETECCIÓN EXPLÍCITA (Alta confianza)
  // Usuario dice claramente su nombre: "soy Juan", "me llamo María"
  for (const pattern of EXPLICIT_INTRO_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const name = normalizeName(match[1]);
      if (name && !isBlacklisted(name)) {
        return {
          detected: true,
          name,
          confidence: 'high',
          reason: 'Presentación explícita detectada'
        };
      }
    }
  }
  
  // 2. DETECCIÓN CONTEXTUAL (Media-Alta confianza)
  // Bot preguntó el nombre Y usuario responde con una sola palabra
  if (previousBotMessage && botAskedForName(previousBotMessage)) {
    const singleWordMatch = message.match(SINGLE_WORD_NAME_PATTERN);
    if (singleWordMatch?.[1]) {
      const name = normalizeName(singleWordMatch[1]);
      if (name && !isBlacklisted(name)) {
        return {
          detected: true,
          name,
          confidence: 'high',
          reason: 'Respuesta directa a pregunta de nombre'
        };
      }
    }
    
    // Bot preguntó y usuario responde algo más largo, buscar nombre
    const nameInResponse = extractNameFromResponse(message);
    if (nameInResponse) {
      return {
        detected: true,
        name: nameInResponse,
        confidence: 'medium',
        reason: 'Nombre extraído de respuesta a pregunta'
      };
    }
  }
  
  // 3. DETECCIÓN HEURÍSTICA (Baja confianza)
  // Mensaje corto que parece solo un nombre, sin contexto previo
  if (message.length <= 20 && !message.includes(' ')) {
    const match = message.match(SINGLE_WORD_NAME_PATTERN);
    if (match?.[1]) {
      const name = normalizeName(match[1]);
      if (name && !isBlacklisted(name) && looksLikeName(name)) {
        return {
          detected: true,
          name,
          confidence: 'low',
          reason: 'Palabra única que parece nombre'
        };
      }
    }
  }
  
  // No se detectó nombre
  return {
    detected: false,
    name: null,
    confidence: 'none',
    reason: 'No se detectó nombre en el mensaje'
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Verifica si el mensaje del bot preguntó por el nombre
 */
function botAskedForName(botMessage: string): boolean {
  return BOT_ASKED_NAME_PATTERNS.some(pattern => pattern.test(botMessage));
}

/**
 * Normaliza un nombre (capitaliza primera letra)
 */
function normalizeName(name: string): string | null {
  if (!name || name.length < 2) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Verifica si una palabra está en la blacklist
 */
function isBlacklisted(word: string): boolean {
  return BLACKLIST.has(word.toLowerCase());
}

/**
 * Heurística: ¿Esta palabra parece un nombre?
 */
function looksLikeName(word: string): boolean {
  // Muy corto o muy largo probablemente no es nombre
  if (word.length < 3 || word.length > 15) return false;
  
  // Solo letras (con acentos)
  if (!/^[A-Za-záéíóúñÁÉÍÓÚÑ]+$/.test(word)) return false;
  
  // No termina en patrones comunes de no-nombres
  const badEndings = ['ar', 'er', 'ir', 'cion', 'mente', 'dad', 'aje'];
  const lower = word.toLowerCase();
  if (badEndings.some(ending => lower.endsWith(ending) && lower.length > ending.length + 2)) {
    return false;
  }
  
  // Probablemente es un nombre
  return true;
}

/**
 * Extrae nombre de una respuesta más larga
 * Ej: "Mi nombre es Juan, mucho gusto" → "Juan"
 */
function extractNameFromResponse(message: string): string | null {
  // Buscar patrones de nombre en medio del mensaje
  const patterns = [
    /(?:me llamo|soy|mi nombre es)\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i,
    /^([A-Za-záéíóúñÁÉÍÓÚÑ]+)[,!.]?\s+(?:mucho gusto|un placer|encantado)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const name = normalizeName(match[1]);
      if (name && !isBlacklisted(name)) {
        return name;
      }
    }
  }
  
  return null;
}

// ============================================================================
// API SIMPLIFICADA (Compatibilidad hacia atrás)
// ============================================================================

/**
 * API simple: extrae nombre o retorna null
 * Para uso donde no se necesita el contexto completo
 */
export function extraerNombre(mensaje: string, mensajeAnteriorBot?: string): string | null {
  const result = detectName({
    userMessage: mensaje,
    previousBotMessage: mensajeAnteriorBot,
  });
  
  // Solo retornar si la confianza es suficiente
  if (result.detected && (result.confidence === 'high' || result.confidence === 'medium')) {
    console.log(`🎯 Nombre detectado: "${result.name}" (${result.confidence}) - ${result.reason}`);
    return result.name;
  }
  
  // Baja confianza: solo aceptar si hay contexto
  if (result.detected && result.confidence === 'low' && mensajeAnteriorBot) {
    console.log(`🎯 Nombre detectado (low confidence): "${result.name}" - ${result.reason}`);
    return result.name;
  }
  
  return null;
}
