/**
 * DATOS DE GUILLERMO FERNÁNDEZ
 * ============================
 * Única fuente de verdad para toda la información del desarrollador.
 * Cualquier cambio aquí se refleja en todo el sistema.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface Proyecto {
  readonly nombre: string;
  readonly url: string | null;
  readonly descripcion: string;
  readonly stack: string;
  readonly features?: readonly string[];
}

export interface ContactoInfo {
  readonly calendly: string;
  readonly email: string;
  readonly whatsapp: string;
}

export interface StackTecnologico {
  readonly backend: readonly string[];
  readonly frontend: readonly string[];
  readonly databases: readonly string[];
  readonly cloud: readonly string[];
  readonly devops: readonly string[];
  readonly testing: readonly string[];
  readonly integraciones: readonly string[];
  readonly metodologias: readonly string[];
}

export interface DesarrolladorProfile {
  readonly nombre: string;
  readonly nombreCorto: string;
  readonly rol: string;
  readonly ubicacion: string;
  readonly especializacion: string;
  readonly contacto: ContactoInfo;
  readonly stack: StackTecnologico;
  readonly proyectos: readonly Proyecto[];
}

// ============================================================================
// DATOS INMUTABLES
// ============================================================================

export const GUILLERMO: DesarrolladorProfile = {
  nombre: "Guillermo Fernández",
  nombreCorto: "Guillermo",
  rol: "Full Stack Developer Semi Senior",
  ubicacion: "Argentina",
  especializacion: "Backend con Node.js y Nest.js",
  
  contacto: {
    calendly: "https://calendly.com/guille-fernandeeez/30min",
    email: "guille.fernandeeez@gmail.com",
    whatsapp: "+54 9 3764 10-8108"
  },

  stack: {
    backend: ["Node.js", "Nest.js", "Express", "JWT", "Bcrypt", "Passport"],
    frontend: ["React", "Next.js", "TypeScript", "JavaScript"],
    databases: ["PostgreSQL", "MongoDB", "Sequelize", "Mongoose"],
    cloud: ["AWS (EC2, S3, RDS, Lambda)", "Firebase", "Render"],
    devops: ["Docker", "Docker Compose", "CI/CD"],
    testing: ["Jest", "Supertest", "TDD"],
    integraciones: ["API Arca (facturación)", "Resend (email)", "WhatsApp API", "Mercado Pago"],
    metodologias: ["Clean Architecture", "SOLID", "Clean Code", "Repository Pattern"]
  },

  proyectos: [
    {
      nombre: "VOI",
      url: "voi.com.ar",
      descripcion: "Plataforma de venta de entradas para eventos",
      stack: "Nest.js + PostgreSQL + React + Redux",
      features: [
        "QR único por entrada",
        "Integración Mercado Pago",
        "Dashboard métricas tiempo real",
        "Facturación legal API Arca",
        "Sistema de roles completo"
      ]
    },
    {
      nombre: "Smogarg",
      url: null,
      descripcion: "E-commerce con automatización",
      stack: "Node.js + MongoDB + React + Zustand",
      features: [
        "Emails automáticos con Resend",
        "WhatsApp integrado",
        "Gestión de inventario"
      ]
    },
    {
      nombre: "Rezuma",
      url: "rezuma.com.ar",
      descripcion: "E-commerce desplegado en AWS",
      stack: "React + Node.js + AWS"
    },
    {
      nombre: "Molokaih",
      url: "molokaih.com",
      descripcion: "Sitio web moderno",
      stack: "Nest.js + Next + React + VPS"
    }
  ]
} as const;

// ============================================================================
// HELPERS DE FORMATO
// ============================================================================

/**
 * Formatea el stack completo para mostrar
 */
export function formatStack(formato: 'completo' | 'resumen' = 'completo'): string {
  const { stack } = GUILLERMO;
  
  if (formato === 'resumen') {
    return [
      `Backend: ${stack.backend.slice(0, 3).join(', ')}`,
      `Frontend: ${stack.frontend.slice(0, 3).join(', ')}`,
      `Cloud: ${stack.cloud[0]}`
    ].join('\n');
  }
  
  return [
    `📦 **Backend:** ${stack.backend.join(', ')}`,
    `🗄️ **Bases de datos:** ${stack.databases.join(', ')}`,
    `⚛️ **Frontend:** ${stack.frontend.join(', ')}`,
    `☁️ **Cloud:** ${stack.cloud.join(', ')}`,
    `🐳 **DevOps:** ${stack.devops.join(', ')}`,
    `🧪 **Testing:** ${stack.testing.join(', ')}`,
    `🔗 **Integraciones:** ${stack.integraciones.join(', ')}`,
    `📐 **Metodologías:** ${stack.metodologias.join(', ')}`
  ].join('\n');
}

/**
 * Formatea info de un proyecto específico
 */
export function formatProyecto(nombre: string): string | null {
  const proyecto = GUILLERMO.proyectos.find(
    p => p.nombre.toLowerCase() === nombre.toLowerCase()
  );
  
  if (!proyecto) return null;
  
  const lines = [
    `**${proyecto.nombre}**${proyecto.url ? ` (${proyecto.url})` : ''}`,
    proyecto.descripcion,
    `Stack: ${proyecto.stack}`
  ];
  
  if (proyecto.features) {
    lines.push('Features:');
    lines.push(...proyecto.features.map(f => `• ${f}`));
  }
  
  return lines.join('\n');
}

/**
 * Formatea todos los proyectos
 */
export function formatProyectos(): string {
  return GUILLERMO.proyectos
    .map(p => `• **${p.nombre}**${p.url ? ` (${p.url})` : ''} - ${p.descripcion}`)
    .join('\n');
}

/**
 * Formatea info de contacto
 */
export function formatContacto(): string {
  const { contacto } = GUILLERMO;
  return [
    `📅 Calendly: ${contacto.calendly}`,
    `📧 Email: ${contacto.email}`,
    `📱 WhatsApp: ${contacto.whatsapp}`
  ].join('\n');
}
