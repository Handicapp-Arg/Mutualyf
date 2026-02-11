/**
 * VALIDADORES DE RESPUESTA
 * ========================
 * Sistema de validación y corrección post-procesamiento.
 * Asegura que las respuestas cumplan con las reglas del bot.
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface ValidationResult {
  valida: boolean;
  razon?: string;
  codigo?: ValidationErrorCode;
}

export type ValidationErrorCode = 
  | 'PALABRA_PROHIBIDA'
  | 'ERROR_PERSPECTIVA'
  | 'RESPUESTA_VACIA'
  | 'RESPUESTA_MUY_LARGA';

// ============================================================================
// PALABRAS Y PATRONES PROHIBIDOS
// ============================================================================

const PALABRAS_PROHIBIDAS = [
  // Revelar identidad de modelo
  'llama', 'meta', 'language model', 'modelo de lenguaje',
  'entrenamiento', 'training', 'algoritmo', 'openai', 'gpt',
  'soy un ai', 'soy una ia', 'inteligencia artificial',
  'large language', 'neural network', 'red neuronal',
  
  // Frases robóticas
  'como asistente virtual',
  'como modelo de lenguaje',
  'no tengo acceso a',
  'mis capacidades están limitadas'
] as const;

const ERRORES_PERSPECTIVA = [
  /soy guillermo/i,
  /mi proyecto/i,
  /yo desarrollo/i,
  /mis tecnolog[ií]as/i,
  /bienvenido a mi portfolio/i,
  /mi stack/i,
  /yo uso/i,
  /mi experiencia como/i,
  /soy desarrollador/i,
  /soy full stack/i
] as const;

// ============================================================================
// VALIDADOR PRINCIPAL
// ============================================================================

/**
 * Valida que una respuesta cumpla con todas las reglas
 */
export function validarRespuesta(respuesta: string): ValidationResult {
  // Verificar respuesta vacía
  if (!respuesta || respuesta.trim().length === 0) {
    return { 
      valida: false, 
      razon: 'Respuesta vacía',
      codigo: 'RESPUESTA_VACIA'
    };
  }
  
  const lower = respuesta.toLowerCase();
  
  // Verificar palabras prohibidas
  for (const palabra of PALABRAS_PROHIBIDAS) {
    if (lower.includes(palabra.toLowerCase())) {
      return { 
        valida: false, 
        razon: `Contiene palabra prohibida: "${palabra}"`,
        codigo: 'PALABRA_PROHIBIDA'
      };
    }
  }
  
  // Verificar errores de perspectiva (primera persona incorrecta)
  for (const patron of ERRORES_PERSPECTIVA) {
    if (patron.test(respuesta)) {
      return { 
        valida: false, 
        razon: `Error de perspectiva: debe hablar en tercera persona`,
        codigo: 'ERROR_PERSPECTIVA'
      };
    }
  }
  
  // Verificar longitud excesiva (más de 1500 caracteres)
  if (respuesta.length > 1500) {
    return {
      valida: false,
      razon: 'Respuesta demasiado larga',
      codigo: 'RESPUESTA_MUY_LARGA'
    };
  }
  
  return { valida: true };
}

// ============================================================================
// CORRECTOR DE RESPUESTAS
// ============================================================================

/**
 * Corrige errores comunes en respuestas
 * Post-procesamiento para arreglar problemas de perspectiva
 */
export function corregirRespuesta(respuesta: string): string {
  let corregida = respuesta;
  
  // Correcciones de primera a tercera persona
  const correcciones: Array<[RegExp, string]> = [
    // Posesivos
    [/\bmi stack\b/gi, 'el stack de Guillermo'],
    [/\bmis proyectos\b/gi, 'los proyectos de Guillermo'],
    [/\bmi experiencia\b/gi, 'la experiencia de Guillermo'],
    [/\bmis tecnolog[ií]as\b/gi, 'las tecnologías de Guillermo'],
    [/\bmi portfolio\b/gi, 'el portfolio de Guillermo'],
    
    // Verbos en primera persona
    [/\byo desarrollo\b/gi, 'Guillermo desarrolla'],
    [/\byo uso\b/gi, 'Guillermo usa'],
    [/\byo trabajo\b/gi, 'Guillermo trabaja'],
    [/\byo manejo\b/gi, 'Guillermo maneja'],
    [/\byo sé\b/gi, 'Guillermo sabe'],
    
    // Identidad incorrecta
    [/\bsoy desarrollador\b/gi, 'Guillermo es desarrollador'],
    [/\bsoy full stack\b/gi, 'Guillermo es Full Stack'],
    [/\bsoy guillermo\b/gi, 'Guillermo es'],
    
    // Otras correcciones
    [/bienvenido a mi portfolio/gi, 'Te presento el perfil de Guillermo'],
    [/en mi proyecto/gi, 'en su proyecto'],
    [/desarrollé/gi, 'desarrolló']
  ];
  
  for (const [patron, reemplazo] of correcciones) {
    corregida = corregida.replace(patron, reemplazo);
  }
  
  return corregida;
}

// ============================================================================
// PIPELINE DE VALIDACIÓN COMPLETO
// ============================================================================

/**
 * Ejecuta el pipeline completo de validación y corrección
 */
export function procesarRespuesta(respuesta: string): {
  respuesta: string;
  fueCorregida: boolean;
  validacion: ValidationResult;
} {
  // Primero corregir
  const corregida = corregirRespuesta(respuesta);
  const fueCorregida = corregida !== respuesta;
  
  // Luego validar
  const validacion = validarRespuesta(corregida);
  
  if (fueCorregida) {
    console.log('🔧 Respuesta corregida automáticamente');
  }
  
  if (!validacion.valida) {
    console.warn(`⚠️ Validación fallida: ${validacion.razon}`);
  }
  
  return {
    respuesta: corregida,
    fueCorregida,
    validacion
  };
}
