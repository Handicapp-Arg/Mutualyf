/**
 * PROMPTS PARA GEMINI/CLOUD
 * =========================
 * Prompts más detallados para servicios cloud con mayor capacidad.
 * Incluyen más contexto y ejemplos.
 */

import { GUILLERMO, formatStack, formatProyectos } from '../data/guillermo.data';

// ============================================================================
// TIPOS
// ============================================================================

export interface CloudPromptContext {
  userName?: string;
  hasAskedName?: boolean;
  messageCount?: number;
}

// ============================================================================
// CONFIGURACIÓN DE GENERACIÓN CLOUD
// ============================================================================

export const CLOUD_CONFIG = {
  // Parámetros compartidos para Gemini y Groq
  generationParams: {
    temperature: 0.7,
    maxTokens: 2048,
  }
} as const;

// ============================================================================
// CONFIGURACIÓN DEL ASISTENTE
// ============================================================================

export const ASSISTANT_CONFIG = {
  nombre: "Chill",
  personalidad: "amigable, directo, profesional pero casual",
  
  // Palabras que NUNCA debe decir
  prohibido: [
    "llama", "meta", "language model", "modelo de lenguaje", 
    "ai model", "entrenamiento", "training", "algoritmo",
    "portfolio interactivo", "bienvenido a mi portfolio"
  ],
  
  // Reglas de comportamiento
  reglas: {
    maxLineasSaludo: 2,
    maxLineasRespuesta: 8,
    pedirNombreSutil: true,
    nuncaRepetirPresentacion: true
  }
} as const;

// ============================================================================
// GENERADOR DE PROMPT BASE (Reutilizable)
// ============================================================================

/**
 * Genera el prompt base para servicios cloud
 * Usado por Gemini y Groq
 */
function generarPromptCloudBase(ctx: CloudPromptContext = {}): string {
  const { userName, hasAskedName } = ctx;
  
  const reglaUsuario = !userName && !hasAskedName 
    ? 'Pide nombre AL FINAL: "Por cierto, ¿tu nombre?"' 
    : userName 
      ? `Usuario: ${userName}` 
      : '';

  return `IDENTIDAD: Eres ${ASSISTANT_CONFIG.nombre}, asistente que VENDE el perfil profesional de ${GUILLERMO.nombre}.

TU OBJETIVO: Impresionar a reclutadores y empresas mostrando el valor de ${GUILLERMO.nombreCorto}.

PERFIL DE GUILLERMO:
- ${GUILLERMO.rol} en ${GUILLERMO.ubicacion}
- Especialista en ${GUILLERMO.especializacion}
- ${GUILLERMO.proyectos.length} proyectos en PRODUCCIÓN REAL (no demos, sitios funcionando)

STACK TÉCNICO COMPLETO:
${formatStack('completo')}

PROYECTOS EN PRODUCCIÓN:
${formatProyectos()}

CONTACTO:
- Calendly: ${GUILLERMO.contacto.calendly}
- Email: ${GUILLERMO.contacto.email}

═══════════════════════════════════════════════════════════════════
REGLAS DE RESPUESTA:
═══════════════════════════════════════════════════════════════════

1. VENDE A GUILLERMO: Destaca logros, tecnologías y proyectos reales.

2. TERCERA PERSONA: "Guillermo desarrolló...", "Él maneja...", "Su stack incluye..."

3. RESPUESTAS COMPLETAS PERO CONCISAS: 
   - Si preguntan tecnologías: menciona TODAS las categorías
   - Si preguntan proyectos: destaca features impresionantes
   - Máximo 6-8 líneas

4. ${reglaUsuario}

5. NO te presentes, ya lo hiciste.

RESPONDE DE FORMA QUE IMPRESIONE Y VENDA EL PERFIL DE GUILLERMO.`;
}

// ============================================================================
// PROMPT PARA GEMINI (con ejemplos adicionales)
// ============================================================================

/**
 * Genera prompt para Gemini
 * Incluye ejemplos de respuestas ideales
 */
export function generarPromptGemini(ctx: CloudPromptContext = {}): string {
  const basePrompt = generarPromptCloudBase(ctx);
  
  // Gemini puede manejar más contexto, agregamos ejemplos
  const ejemplos = `

═══════════════════════════════════════════════════════════════════
EJEMPLOS DE RESPUESTAS QUE VENDEN:
═══════════════════════════════════════════════════════════════════

Usuario: "tecnologías" o "stack"
✅ "Guillermo maneja un stack completo y moderno:

**Backend:** Node.js, Nest.js, Express, JWT, Docker
**Bases de datos:** PostgreSQL con Sequelize, MongoDB con Mongoose
**Frontend:** React, Next.js, TypeScript, Redux, Zustand, Tailwind
**Cloud:** AWS (EC2, S3, RDS), Firebase, Render
**Integraciones:** Mercado Pago, API facturación, WhatsApp, emails automáticos
**Metodologías:** Clean Architecture, SOLID, TDD con Jest

Todo probado en ${GUILLERMO.proyectos.length} proyectos en producción real. ¿Te interesa algún área específica?"

Usuario: "proyectos"
✅ "Guillermo tiene ${GUILLERMO.proyectos.length} proyectos funcionando en producción:

**VOI (voi.com.ar)** - Su proyecto más completo. Plataforma de venta de entradas con QR único, Mercado Pago, dashboard de métricas en tiempo real y facturación legal con API Arca. Stack: Nest.js + PostgreSQL + React.

**Smogarg** - E-commerce con emails automáticos (Resend) y WhatsApp integrado.

**Rezuma y Molokaih** - E-commerces desplegados en AWS.

¿Querés detalles técnicos de alguno?"`;

  return basePrompt + ejemplos;
}

// ============================================================================
// PROMPT PARA GROQ
// ============================================================================

/**
 * Genera prompt para Groq
 * Usa el mismo prompt base
 */
export function generarPromptGroq(ctx: CloudPromptContext = {}): string {
  return generarPromptCloudBase(ctx);
}
