import { Injectable } from "@nestjs/common";
import { Category, Intent } from "./rag.types";
import { RagConfig } from "./rag.config";

const CHITCHAT_RE =
  /^(\s*(hola|holaa+|buenas|buen(os)?\s*(dias|tardes|noches)|hey|ola|que tal|como (andas|estas|va)|gracias|muchas gracias|chau|adios|hasta luego|ok|dale|perfecto|genial|👋|🙂|😊|❤️|👍)\s*[!?.,]*\s*)+$/i;

/**
 * Preguntas meta sobre el bot: quién sos, qué hacés, en qué me podés ayudar.
 * Estas NO son off-topic — las responde el LLM con el base prompt.
 */
const META_RE =
  /\b(como te llam|quien (sos|eres)|que (sos|eres)|que (haces|podes hacer)|(en\s+)?que me (podes|puedes) ayudar|para que (servis|sirves)|ayuda(me)?|necesito ayuda|sos un bot|sos humano)\b/i;

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  contact: [
    "telefono",
    "teléfono",
    "0800",
    "whatsapp",
    "contacto",
    "horario",
    "horarios",
    "atencion",
    "atención",
    "sede",
    "sedes",
    "direccion",
    "dirección",
  ],
  services: [
    "servicio",
    "servicios",
    "especialidad",
    "especialidades",
    "cardiologia",
    "pediatria",
    "ginecologia",
    "odontologia",
    "oftalmologia",
    "nutricion",
    "clinica",
    "psicolog",
    "salud mental",
    "medico",
    "medica",
    "doctor",
    "doctora",
    "consulta",
  ],
  payments: [
    "pago",
    "pagos",
    "coseguro",
    "coseguros",
    "tarjeta",
    "credito",
    "débito",
    "debito",
    "mercado pago",
    "bono link",
    "santa fe servicios",
    "cobro",
    "factura",
  ],
  meds: [
    "medicamento",
    "medicamentos",
    "remedio",
    "remedios",
    "farmacia",
    "vademecum",
    "receta",
    "recetas",
    "crónico",
    "cronico",
  ],
  procedure: [
    "orden",
    "ordenes",
    "órdenes",
    "autorizacion",
    "autorización",
    "autorizaciones",
    "tramite",
    "trámite",
    "tramites",
    "trámites",
    "solicitud",
    "reintegro",
    "reintegros",
    "estudio",
    "estudios",
    "practica",
    "práctica",
    "subir",
    "cargar",
    "archivo",
  ],
  legal: [
    "reglamento",
    "estatuto",
    "ley",
    "norma",
    "clausula",
    "cláusula",
    "reclamo",
    "denuncia",
  ],
  platform: [
    "plataforma",
    "mimutualyf",
    "mi mutualyf",
    "app",
    "web",
    "online",
    "portal",
    "autogestion",
    "autogestión",
    "login",
    "usuario",
    "contraseña",
  ],
  general: [],
};

const PRONOUN_RE =
  /\b(eso|ese|esa|esos|esas|ahi|ahí|alli|allí|y el|y la|y los|y las|y eso|mas|más)\b/i;

@Injectable()
export class RouterService {
  constructor(private readonly cfg: RagConfig) {}

  classify(message: string): Intent {
    const trimmed = message.trim();
    if (trimmed.length === 0)
      return { kind: "chitchat", categoryConfident: false };
    if (CHITCHAT_RE.test(trimmed) && trimmed.length < 40) {
      return { kind: "chitchat", categoryConfident: false };
    }
    // Meta-preguntas sobre el bot: se tratan como chitchat (sin retrieval,
    // el LLM responde usando el BASE_SYSTEM_PROMPT que ya describe su rol).
    if (META_RE.test(trimmed) && trimmed.length < 80) {
      return { kind: "chitchat", categoryConfident: false };
    }
    const normalized = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let best: { cat: Category; hits: number } | null = null;
    for (const cat of Object.keys(CATEGORY_KEYWORDS) as Category[]) {
      const kws = CATEGORY_KEYWORDS[cat];
      let hits = 0;
      for (const kw of kws) {
        if (
          normalized.includes(
            kw.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          )
        )
          hits++;
      }
      if (hits > 0 && (!best || hits > best.hits)) best = { cat, hits };
    }

    return {
      kind: "rag",
      category: best?.cat,
      categoryConfident: !!best && best.hits >= 2,
    };
  }

  needsRewrite(msg: string, hasHistory: boolean): boolean {
    if (!hasHistory) return false;
    const words = msg.trim().split(/\s+/).length;
    if (words < 6) return true;
    return PRONOUN_RE.test(msg);
  }

  dynamicK(query: string): number {
    const words = query.trim().split(/\s+/).length;
    const clauses = (query.match(/[,;]|\s+y\s+|\s+o\s+/g) || []).length;
    if (words < 6) return this.cfg.kSmall;
    if (clauses >= 2 || words > 18) return this.cfg.kLarge;
    return this.cfg.kMedium;
  }
}
