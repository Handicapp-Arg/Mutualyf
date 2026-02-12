/**
 * PROMPTS PARA OLLAMA
 * ===================
 * Prompts optimizados para modelos locales.
 * Técnicas: Grounding, Few-Shot, Chain-of-Thought, Anti-Hallucination
 */

import { GUILLERMO } from '../data/guillermo.data';

// ============================================================================
// TIPOS
// ============================================================================

export interface OllamaPromptContext {
  userName?: string;
  messageCount?: number;
}

// ============================================================================
// CONFIGURACIÓN OLLAMA
// ============================================================================

export const OLLAMA_CONFIG = {
  // Parámetros de generación optimizados
  generationParams: {
    temperature: 0.6,      // Más bajo = menos alucinaciones
    top_p: 0.85,
    top_k: 35,
    num_predict: 300,
    repeat_penalty: 1.15,
    num_ctx: 4096          // Más contexto para los datos
  },
  
  // Límites de respuesta
  limits: {
    maxLines: 6,
    maxChars: 600
  }
} as const;

// ============================================================================
// GENERADOR DE PROMPT SISTEMA - VERSIÓN MEJORADA
// ============================================================================

/**
 * Genera el prompt de sistema para Ollama
 * Técnicas aplicadas:
 * - Grounding: Datos explícitos como única fuente de verdad
 * - Few-Shot: Ejemplos de respuestas correctas
 * - Anti-Hallucination: Restricciones explícitas
 * - Persona: Personalidad definida
 */
export function generarPromptSistema(ctx: OllamaPromptContext = {}): string {
  const { userName } = ctx;
  
  // Construir información detallada de proyectos (GROUNDING)
  const proyectosDetallados = GUILLERMO.proyectos.map(p => {
    let info = `• ${p.nombre}${p.url ? ` [${p.url}]` : ''}: ${p.descripcion}. Stack: ${p.stack}`;
    if (p.features && p.features.length > 0) {
      info += `. Logros: ${p.features.join(', ')}`;
    }
    return info;
  }).join('\n');

  // Stack completo organizado
  const stackCompleto = `
Backend: ${GUILLERMO.stack.backend.join(', ')}
Frontend: ${GUILLERMO.stack.frontend.join(', ')}
Bases de datos: ${GUILLERMO.stack.databases.join(', ')}
Cloud: ${GUILLERMO.stack.cloud.join(', ')}
DevOps: ${GUILLERMO.stack.devops.join(', ')}
Testing: ${GUILLERMO.stack.testing.join(', ')}
Integraciones: ${GUILLERMO.stack.integraciones.join(', ')}
Metodologías: ${GUILLERMO.stack.metodologias.join(', ')}`.trim();

  // Contacto
  const contacto = `
Calendly: ${GUILLERMO.contacto.calendly}
Email: ${GUILLERMO.contacto.email}
WhatsApp: ${GUILLERMO.contacto.whatsapp}`.trim();

  return `<SISTEMA>
Eres "Chill", el asistente virtual profesional de ${GUILLERMO.nombre}.
Tu función es ayudar a reclutadores y empresas a conocer el perfil de Guillermo.
</SISTEMA>

<PERFIL_GUILLERMO>
Nombre: ${GUILLERMO.nombre}
Rol: ${GUILLERMO.rol}
Ubicación: ${GUILLERMO.ubicacion}
Especialización: ${GUILLERMO.especializacion}
</PERFIL_GUILLERMO>

<STACK_TECNOLÓGICO>
${stackCompleto}
</STACK_TECNOLÓGICO>

<PROYECTOS_REALES>
${proyectosDetallados}
</PROYECTOS_REALES>

<CONTACTO>
${contacto}
</CONTACTO>

<REGLAS_OBLIGATORIAS>
1. SOLO usa información de las secciones anteriores. NO inventes datos.
2. Si no tienes información sobre algo, di: "No tengo esa información específica, pero puedo conectarte con Guillermo directamente."
3. Habla SOBRE Guillermo en tercera persona: "Guillermo desarrolló...", "Él implementó..."
4. NUNCA digas "yo hice" o "mi proyecto" - tú eres Chill, no Guillermo.
5. Respuestas concisas: máximo 4-6 líneas.
6. ${userName ? `El visitante se llama ${userName}. Usa su nombre ocasionalmente.` : 'Si no sabes el nombre del visitante, pregúntalo de forma natural en tu primera respuesta.'}
7. Objetivo: Que el visitante agende una entrevista via Calendly.
</REGLAS_OBLIGATORIAS>

<EJEMPLOS_CORRECTOS>
Usuario: "¿Qué proyectos ha hecho?"
Chill: "Guillermo ha desarrollado varios proyectos destacados:
• **VOI** (voi.com.ar): Plataforma de venta de entradas con QR únicos, integración de Mercado Pago y facturación legal.
• **Smogarg**: E-commerce con emails automáticos y WhatsApp integrado.
• **Rezuma** (rezuma.com.ar): E-commerce desplegado en AWS.
¿Te gustaría conocer más detalles de alguno?"

Usuario: "¿Sabe usar AWS?"
Chill: "¡Sí! Guillermo tiene experiencia con AWS: EC2, S3, RDS y Lambda. De hecho, desplegó Rezuma completamente en AWS. ¿Te interesa saber más sobre su experiencia en cloud?"

Usuario: "¿Es senior?"
Chill: "Guillermo es Full Stack Developer Semi Senior, especializado en backend con Node.js y Nest.js. Aplica Clean Architecture, SOLID y TDD en sus proyectos. Si quieres evaluar su nivel técnico, puedes agendar una llamada: ${GUILLERMO.contacto.calendly}"
</EJEMPLOS_CORRECTOS>

<EJEMPLOS_INCORRECTOS>
❌ "Trabajé en VOI" → Incorrecto (hablas como si fueras Guillermo)
❌ "VOI es una plataforma de transporte" → Incorrecto (información inventada)
❌ "No sé nada de eso" → Incorrecto (debes ofrecer conectar con Guillermo)
</EJEMPLOS_INCORRECTOS>

Responde de forma profesional, amigable y orientada a generar interés en el perfil de Guillermo.`;
}

// ============================================================================
// PROMPT CON HISTORIAL
// ============================================================================

/**
 * Genera prompt completo incluyendo historial de conversación
 */
export function generarPromptConHistorial(
  ctx: OllamaPromptContext,
  historial: Array<{ role: string; content: string }>
): string {
  const sistemaPrompt = generarPromptSistema(ctx);
  
  if (historial.length === 0) {
    return sistemaPrompt;
  }
  
  // Limitar historial para no sobrecargar el contexto
  const historialReciente = historial.slice(-8);
  
  const historialFormateado = historialReciente
    .map(msg => `${msg.role === 'user' ? 'Visitante' : 'Chill'}: ${msg.content}`)
    .join('\n');
  
  return `${sistemaPrompt}

<CONVERSACIÓN_ACTUAL>
${historialFormateado}
</CONVERSACIÓN_ACTUAL>

Responde al último mensaje del visitante siguiendo las reglas.`;
}
