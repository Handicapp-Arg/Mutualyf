/**
 * RESPUESTAS DE FALLBACK
 * ======================
 * Respuestas predefinidas seguras para cuando la IA falla.
 * Garantizan que el usuario SIEMPRE reciba una respuesta útil.
 */

import { 
  GUILLERMO, 
  formatStack, 
  formatProyectos, 
  formatContacto,
  formatProyecto 
} from '../data/guillermo.data';

// ============================================================================
// TIPOS
// ============================================================================

export type Intencion = 
  | 'saludo' 
  | 'stack' 
  | 'proyectos' 
  | 'contacto' 
  | 'voi' 
  | 'experiencia' 
  | 'default';

// ============================================================================
// DETECTOR DE INTENCIÓN
// ============================================================================

const PATRONES_INTENCION: Record<Intencion, RegExp[]> = {
  saludo: [
    /^hola/i, 
    /^hey/i, 
    /^buenas/i, 
    /^buenos/i, 
    /^hi\b/i, 
    /^hello/i,
    /^qué tal/i,
    /^que tal/i
  ],
  stack: [
    /tecnolog[ií]a/i, 
    /stack/i, 
    /lenguaje/i, 
    /framework/i, 
    /herramienta/i, 
    /qu[eé] (sabe|usa|maneja|conoce)/i,
    /programaci[oó]n/i
  ],
  proyectos: [
    /proyecto/i, 
    /portfolio/i, 
    /trabaj[oó]/i, 
    /hiciste/i, 
    /hizo/i, 
    /desarroll[oó]/i,
    /creó/i,
    /creo/i
  ],
  contacto: [
    /contacto/i, 
    /contactar/i, 
    /llamada/i, 
    /reuni[oó]n/i, 
    /calendly/i, 
    /email/i, 
    /disponib/i,
    /agendar/i,
    /hablar con/i
  ],
  voi: [
    /\bvoi\b/i, 
    /entrada/i, 
    /evento/i, 
    /ticket/i
  ],
  experiencia: [
    /experiencia/i, 
    /background/i, 
    /trayectoria/i, 
    /cv/i, 
    /curriculum/i, 
    /perfil/i,
    /qui[eé]n es/i
  ],
  default: []
};

/**
 * Detecta la intención del mensaje del usuario
 */
export function detectarIntencion(mensaje: string): Intencion {
  const msg = mensaje.toLowerCase().trim();
  
  for (const [intencion, patrones] of Object.entries(PATRONES_INTENCION)) {
    if (patrones.some(regex => regex.test(msg))) {
      return intencion as Intencion;
    }
  }
  
  return 'default';
}

// ============================================================================
// RESPUESTAS SEGURAS
// ============================================================================

export const RESPUESTAS_SEGURAS: Record<Intencion, (nombre?: string) => string> = {
  saludo: (nombre?: string) => 
    nombre 
      ? `¡Hola ${nombre}! Soy Chill, el asistente de ${GUILLERMO.nombreCorto}. ` +
        `¿Qué te gustaría saber sobre él? Puedo contarte sobre sus proyectos, ` +
        `tecnologías o disponibilidad.`
      : `¡Hola! Soy Chill, el asistente de ${GUILLERMO.nombre}. ` +
        `¿Cómo te llamas? Así te atiendo mejor.`,
  
  stack: () => 
    `${GUILLERMO.nombreCorto} maneja un stack completo:\n\n` +
    formatStack('completo') +
    `\n\nTodo probado en ${GUILLERMO.proyectos.length} proyectos en producción.`,
  
  proyectos: () => 
    `${GUILLERMO.nombreCorto} tiene ${GUILLERMO.proyectos.length} proyectos en producción:\n\n` +
    formatProyectos() +
    `\n\n¿Te interesa alguno en particular?`,
  
  contacto: () => 
    `Podés agendar una llamada con ${GUILLERMO.nombreCorto}:\n\n` +
    formatContacto(),
  
  voi: () => formatProyecto('VOI') || RESPUESTAS_SEGURAS.default(),
    
  experiencia: () =>
    `${GUILLERMO.nombre} es ${GUILLERMO.rol} con experiencia en:\n\n` +
    `• Backend robusto con Node.js y Nest.js\n` +
    `• Bases de datos SQL y NoSQL\n` +
    `• Frontend moderno con React y Next.js\n` +
    `• Despliegue en AWS y Docker\n` +
    `• ${GUILLERMO.proyectos.length} proyectos funcionando en producción real`,

  default: () =>
    `Puedo contarte sobre ${GUILLERMO.nombreCorto}: sus proyectos, tecnologías que maneja, ` +
    `o cómo contactarlo. ¿Qué te interesa?`
};

/**
 * Obtiene respuesta segura según la intención detectada
 */
export function obtenerRespuestaSegura(mensaje: string, nombreUsuario?: string): string {
  const intencion = detectarIntencion(mensaje);
  console.log(`🎯 Intención detectada: ${intencion}`);
  return RESPUESTAS_SEGURAS[intencion](nombreUsuario);
}
