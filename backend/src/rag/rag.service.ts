import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RagConfig } from "./rag.config";
import { HydratedChunk, RetrievalResult, ChatMsg } from "./rag.types";
import { escapeXmlAttr } from "./sanitizer";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: RagConfig,
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
  }> {
    // Carga directa de todos los chunks activos — sin embeddings ni vector search.
    // Apropiado para KBs pequeñas donde todo el contenido entra en el prompt.
    const rows = await this.prisma.knowledgeChunk.findMany({
      where: { doc: { status: "active" } },
      include: { doc: true },
      orderBy: [{ docId: "asc" }, { ord: "asc" }],
    });

    const chunks: HydratedChunk[] = rows.map((r) => ({
      id: r.id,
      content: r.content,
      contentClean: r.contentClean,
      category: r.category,
      source: r.doc.source,
      docTitle: r.doc.title,
      tokens: r.tokens,
    }));

    this.logger.debug(
      `direct-load: ${chunks.length} chunks para query="${opts.query.slice(0, 60)}"`,
    );

    const systemPrompt = this.buildSystemPrompt(opts.basePrompt, chunks);
    return { systemPrompt, retrieval: null };
  }

  private buildSystemPrompt(base: string, chunks: HydratedChunk[]): string {
    if (chunks.length === 0) {
      return `${base}

NOTA DE ESTE TURNO: No hay información en la base de conocimiento todavía.
INSTRUCCIÓN: Indicá al usuario que aún no tenés datos cargados y que puede contactar a MutuaLyF directamente.
PROHIBIDO ABSOLUTO: inventar teléfonos, URLs, emails, horarios, nombres de profesionales o cualquier dato concreto.`;
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
