import { Injectable, Logger } from "@nestjs/common";
import { RetrievalService } from "./retrieval.service";
import { RagConfig } from "./rag.config";
import { HydratedChunk, Intent, RetrievalResult, ChatMsg } from "./rag.types";
import { escapeXmlAttr } from "./sanitizer";
import { TopicClassifierService, TopicResult } from "./topic-classifier.service";
import { OfftopicResponderService } from "./offtopic-responder.service";
import { TopicClassifierDebug } from "./rag.metrics";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly cfg: RagConfig,
    private readonly topic: TopicClassifierService,
    private readonly offtopicResponder: OfftopicResponderService,
  ) {}

  async prepare(opts: {
    query: string;
    history: ChatMsg[];
    basePrompt: string;
    sessionId?: string;
  }): Promise<{
    systemPrompt: string;
    retrieval: RetrievalResult | null;
    shortCircuit?: string;
    topic?: TopicResult;
  }> {
    // 1. Clasificador semántico — reemplaza al keyword guard hardcodeado.
    //    Acepta embeddings fallidos / KB vacío / follow-ups con degradación graceful.
    const topic = await this.topic.classify(opts.query, {
      hasHistory: opts.history.length > 0,
    });

    const topicDebug: TopicClassifierDebug = {
      decision: topic.decision,
      score: topic.score,
      bestCategory: topic.bestCategory,
      source: topic.source,
      latencyMs: topic.latencyMs,
      reason: topic.reason,
    };

    // Short-circuit sólo cuando hay SEÑAL CLARA de off-topic (no por ausencia
    // de señal). Zona ambigua NO corta — se envía al retrieval y que el
    // multi-signal detector decida con evidencia real de la KB.
    if (topic.decision === "OFF_TOPIC") {
      const reply = await this.offtopicResponder.respond({
        query: opts.query,
        topCategory: topic.bestCategory,
      });
      return {
        systemPrompt: opts.basePrompt,
        retrieval: null,
        shortCircuit: reply,
        topic,
      };
    }

    // 2. Shortcut para meta/chitchat detectado por intent prototypes —
    //    no tiene sentido correr retrieval para "sos una IA?" o "hola".
    //    El LLM responde con el base prompt (ya sabe que es MutuaBot).
    if (topic.intentKind === "meta" || topic.intentKind === "chitchat") {
      const systemPrompt = this.buildConversationalPrompt(
        opts.basePrompt,
        topic.intentKind,
      );
      return { systemPrompt, retrieval: null, topic };
    }

    // 3. Retrieval con reuso del embedding del clasificador.
    let retrieval: RetrievalResult;
    try {
      retrieval = await this.retrieval.search({
        query: opts.query,
        history: opts.history,
        sessionId: opts.sessionId,
        precomputedQueryEmbedding: topic.queryEmbedding,
        topicDebug,
      });
    } catch (e) {
      this.logger.warn(
        `retrieval failed, degrading to base prompt: ${(e as Error).message}`,
      );
      return { systemPrompt: opts.basePrompt, retrieval: null, topic };
    }

    // 4. El multi-signal detector puede seguir declarando off-topic con
    //    evidencia concreta de vec+FTS. En ese caso también usamos la
    //    respuesta inteligente, no un string fijo.
    if (retrieval.intent.kind === "offtopic") {
      const reply = await this.offtopicResponder.respond({
        query: opts.query,
        topCategory: topic.bestCategory ?? retrieval.intent.category ?? null,
      });
      return {
        systemPrompt: opts.basePrompt,
        retrieval,
        shortCircuit: reply,
        topic,
      };
    }

    const systemPrompt = this.buildSystemPrompt(
      opts.basePrompt,
      retrieval.chunks,
      retrieval.intent,
    );
    return { systemPrompt, retrieval, topic };
  }

  /**
   * Prompt para conversación natural (meta/chitchat). El base prompt ya
   * describe al bot; acá ajustamos el tono para que NUNCA diga "no puedo
   * ayudarte" frente a un saludo y siempre se identifique en primera persona.
   */
  private buildConversationalPrompt(base: string, intentKind: "meta" | "chitchat"): string {
    if (intentKind === "meta") {
      return `${base}

NOTA DE ESTE TURNO — Pregunta META sobre vos (identidad, capacidades, naturaleza):
- Hablá SIEMPRE en primera persona ("Soy MutuaBot", NUNCA "Sos").
- Presentate explícitamente como MutuaBot, el asistente virtual de MutuaLyF.
- 1-2 oraciones máx, español rioplatense (usá "acá" no "aquí"), tono cálido y natural.
- Cerrá invitando a consultar — por ejemplo "¿En qué te puedo ayudar?".
- PROHIBIDO: decir "no puedo", citar documentos, derivar al 0800, usar emojis, repetir la pregunta.`;
    }
    return `${base}

NOTA DE ESTE TURNO — Saludo, agradecimiento o despedida:
- Devolvé el saludo (o reconocé el agradecimiento) en 1 oración natural rioplatense.
- SIEMPRE invitá al usuario a contarte en qué podés ayudarlo (ej: "¿En qué te puedo ayudar hoy?").
- PROHIBIDO ABSOLUTO: decir "no puedo ayudarte" o cualquier negativa frente a un saludo. Un "hola" se contesta con otro "hola" + ofrecimiento de ayuda.
- PROHIBIDO: citar documentos, derivar al 0800, usar emojis, dar respuestas largas.`;
  }

  private buildSystemPrompt(
    base: string,
    chunks: HydratedChunk[],
    intent: Intent,
  ): string {
    if (intent.kind === "chitchat") {
      return `${base}

TONO: amable, breve, rioplatense.`;
    }

    if (chunks.length === 0) {
      return `${base}

NOTA DE ESTE TURNO: No encontraste información específica para esta consulta en la base de conocimiento.
INSTRUCCIÓN: Respondé exactamente con una de estas dos opciones:
1. Si la consulta es muy general o ambigua → hacé UNA repregunta corta para entender mejor qué necesita el usuario.
2. Si la consulta es específica pero no tenés el dato → decí "No tengo esa información disponible en este momento." y ofrecé que consulte en la sede o se comunique con MutuaLyF directamente.
PROHIBIDO ABSOLUTO: inventar teléfonos, URLs, emails, horarios, nombres de profesionales o cualquier dato concreto que no esté en el contexto.`;
    }

    // Token budget: cortar desde el final si excede
    const budgeted: HydratedChunk[] = [];
    let used = 0;
    for (const c of chunks) {
      if (used + c.tokens > this.cfg.contextTokenBudget && budgeted.length > 0)
        break;
      budgeted.push(c);
      used += c.tokens;
    }

    const ctxBlocks = budgeted
      .map(
        (c, i) =>
          `<doc id="${i + 1}" category="${escapeXmlAttr(c.category)}" source="${escapeXmlAttr(c.source)}">\n${c.contentClean}\n</doc>`,
      )
      .join("\n");

    return `${base}

REGLA ABSOLUTA — ANTI-ALUCINACIÓN:
SOLO podés usar datos que aparezcan LITERALMENTE en los bloques <doc> de abajo.
PROHIBIDO TOTAL: inventar nombres, apellidos, horarios, especialidades, días, teléfonos o cualquier dato que no esté textualmente en el contexto.
Si el usuario pide algo que no está en los <doc>, decí: "No tengo esa información disponible."
Si el contexto tiene información parcial, mostrá SOLO lo que está y aclará que es lo que tenés.
NUNCA completes, supongas ni inferás datos ausentes.

INSTRUCCIONES DE USO DEL CONTEXTO:
- Los bloques <doc> son la ÚNICA fuente de verdad. Ignorá tu conocimiento previo para datos concretos.
- Para planillas y listas: transcribí EXACTAMENTE las filas que aparecen en el contexto, sin agregar ni quitar registros.
- Si hay múltiples <doc>, leélos todos antes de responder — la info puede estar distribuida.
- Si no encontrás un dato específico (especialidad, profesional, horario), decí "No tengo esa información" sin inventar alternativas.
- NO menciones "el contexto", "los documentos" ni los IDs — respondé naturalmente.
- Respondé en español rioplatense, claro y conciso.

CONTEXTO:
${ctxBlocks}`;
  }
}
