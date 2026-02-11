/**
 * PROMPT SYSTEM - Índice Central
 * ==============================
 * Re-exportaciones organizadas del sistema de prompts.
 * 
 * ESTRUCTURA:
 * ├── data/           → Datos de Guillermo (fuente única de verdad)
 * ├── fallback/       → Respuestas seguras cuando IA falla
 * ├── prompts/        → Prompts para cada proveedor
 * └── validators/     → Validación y corrección de respuestas
 */

// ============================================================================
// DATOS
// ============================================================================

export { 
  GUILLERMO,
  formatStack,
  formatProyecto,
  formatProyectos,
  formatContacto,
  type DesarrolladorProfile,
  type Proyecto,
  type ContactoInfo,
  type StackTecnologico
} from './data/guillermo.data';

// ============================================================================
// FALLBACK
// ============================================================================

export {
  RESPUESTAS_SEGURAS,
  detectarIntencion,
  obtenerRespuestaSegura,
  type Intencion
} from './fallback/fallback-responses';

// ============================================================================
// PROMPTS - OLLAMA
// ============================================================================

export {
  generarPromptSistema as generarPromptOllama,
  generarPromptConHistorial as generarPromptOllamaConHistorial,
  OLLAMA_CONFIG,
  type OllamaPromptContext
} from './prompts/ollama.prompts';

// ============================================================================
// PROMPTS - CLOUD (Gemini/Groq)
// ============================================================================

export {
  generarPromptGemini,
  generarPromptGroq,
  ASSISTANT_CONFIG,
  CLOUD_CONFIG,
  type CloudPromptContext
} from './prompts/cloud.prompts';

// ============================================================================
// VALIDADORES
// ============================================================================

export {
  validarRespuesta,
  corregirRespuesta,
  procesarRespuesta,
  type ValidationResult,
  type ValidationErrorCode
} from './validators/response.validators';

// ============================================================================
// DETECCIÓN DE NOMBRES (Sistema inteligente)
// ============================================================================

export {
  detectName,
  extraerNombre,
  type NameDetectionResult,
  type NameConfidence
} from './validators/name-detection';
