import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GroqService } from "../ai/groq.service";
import { RagConfig } from "./rag.config";

/** Mapa de category → label legible. Sólo i18n de etiquetas internas;
 *  si aparece una categoría nueva, cae en default. */
const CATEGORY_LABELS: Record<string, string> = {
  contact: "contacto, teléfonos y horarios",
  services: "especialidades y profesionales",
  payments: "pagos, coseguros y medios de cobro",
  meds: "medicamentos, recetas y farmacia",
  procedure: "autorizaciones, órdenes y trámites",
  legal: "reglamento y normativa",
  platform: "plataforma MiMutuaLyF y autogestión",
  general: "información general",
};

interface CachedCapabilities {
  text: string;
  at: number;
}

/**
 * Genera respuestas contextuales para queries off-topic.
 *
 * Estrategia: LLM-first (Groq, ~200ms) para respuestas naturales, variadas y
 * cálidas; fallback determinista si el LLM falla o se va de tiempo. Cero
 * scripts hardcodeados.
 *
 * Las "capabilities" se derivan dinámicamente del KB activo — agregar/quitar
 * docs cambia automáticamente lo que el bot sugiere poder responder.
 */
@Injectable()
export class OfftopicResponderService {
  private readonly logger = new Logger(OfftopicResponderService.name);
  private cached: CachedCapabilities | null = null;
  private readonly CAPS_TTL_MS = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly groq: GroqService,
    private readonly cfg: RagConfig,
  ) {}

  invalidate(): void {
    this.cached = null;
  }

  async respond(opts: { query: string; topCategory?: string | null }): Promise<string> {
    const capabilities = await this.capabilitiesLine();

    // 1. Generación dinámica con LLM — respuesta cálida y específica.
    try {
      const dynamic = await this.generateDynamic(opts.query, capabilities);
      if (dynamic) return dynamic;
    } catch (e) {
      this.logger.debug(`offtopic LLM gen failed: ${(e as Error).message}`);
    }

    // 2. Fallback determinista — nunca rompe el chat.
    return this.fallback(capabilities);
  }

  /**
   * Pide al LLM una respuesta natural en 2-3 oraciones. Usa Groq (rápido y
   * barato). max_tokens chico + temp moderado evita verbosidad robótica.
   */
  private async generateDynamic(
    query: string,
    capabilities: string,
  ): Promise<string | null> {
    const system = `Sos MutuaBot, el asistente virtual de MutuaLyF (mutual de salud argentina del sindicato Luz y Fuerza de Santa Fe).

El usuario hizo una consulta que NO está dentro de tu alcance (no es sobre MutuaLyF ni servicios de salud).

Tu tarea: responder en 2-3 oraciones máximo, español rioplatense, tono cálido y natural (NO robótico).

Reglas estrictas:
- Aclará brevemente que ese tema no lo manejás.
- Mencioná naturalmente qué SÍ podés ayudar${capabilities ? `: ${capabilities}` : ""} (no lo enumeres como lista, integralo en la oración).
- Cerrá invitando a consultar.
- NO uses emojis.
- NO uses muletillas tipo "entiendo", "comprendo", "lamentablemente".
- NO repitas la pregunta del usuario.
- NO uses comillas ni meta-comentarios.
- Variá el fraseo — evitá empezar todas las respuestas igual.
- Respondé SOLO con la respuesta final, sin prefacios.`;

    const raw = await Promise.race([
      this.groq.generateResponse([], query, system, 0.5, 140),
      new Promise<string>((_, rej) =>
        setTimeout(
          () => rej(new Error("offtopic-gen-timeout")),
          this.cfg.offtopicGenTimeoutMs,
        ),
      ),
    ]);

    const clean = (raw || "")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\n{3,}/g, "\n\n");

    if (clean.length < 20 || clean.length > 500) return null;
    return clean;
  }

  /**
   * Plantilla determinista — sólo se usa si Groq falla o timeout.
   * Es una sola, simple y cálida. No randomizamos para mantener
   * comportamiento predecible bajo fallback.
   */
  private fallback(capabilities: string): string {
    if (!capabilities) {
      return "Hola, soy MutuaBot. Esa consulta no la manejo, pero estoy para ayudarte con todo lo de MutuaLyF. ¿En qué te puedo asistir?";
    }
    return `Hola, soy MutuaBot. Ese tema queda fuera de lo que puedo resolver, pero te puedo ayudar con ${capabilities}. ¿Qué necesitás consultar?`;
  }

  /**
   * Línea con capacidades actuales, derivada de las categorías activas
   * del KB. Cacheada 10 min — cambia raramente.
   */
  private async capabilitiesLine(): Promise<string> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < this.CAPS_TTL_MS) {
      return this.cached.text;
    }

    try {
      const rows = await this.prisma.knowledgeDoc.groupBy({
        by: ["category"],
        where: {
          status: "active",
          // Excluir categorías reservadas de intent (no son capacidades del bot)
          NOT: { category: { startsWith: "_" } },
        },
        _count: { _all: true },
      });

      const labels = rows
        .map((r) => CATEGORY_LABELS[r.category] ?? r.category)
        .filter((v, i, a) => a.indexOf(v) === i);

      const text = !labels.length
        ? ""
        : labels.length === 1
          ? labels[0]
          : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;

      this.cached = { text, at: now };
      return text;
    } catch (e) {
      this.logger.warn(`capabilities query failed: ${(e as Error).message}`);
      return "";
    }
  }
}
