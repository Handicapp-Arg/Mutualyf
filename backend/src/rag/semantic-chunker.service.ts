import { Injectable, Logger } from "@nestjs/common";
import { GroqService } from "../ai/groq.service";
import { RagConfig } from "./rag.config";
import { chunkText } from "./chunker";

type QualityReason = "pipe-tables" | "garbled-text" | "flat-lists";

interface SegmentQuality {
  needsEnrichment: boolean;
  reasons: QualityReason[];
}

export type DocType =
  | "schedule"          // cartillas de horarios / turnos de profesionales
  | "specialist-dir"    // directorios de especialistas / cartilla médica
  | "law-regulation"    // leyes, decretos, resoluciones, estatutos
  | "pricing"           // aranceles, precios, coseguros
  | "procedure"         // trámites, pasos, instructivos
  | "coverage"          // coberturas, planes, prestaciones
  | "contact"           // teléfonos, direcciones, sucursales
  | "general";          // documento mixto o sin tipo claro

export interface DocContext {
  docType: DocType;
  /** Descripción de una línea de qué trata el documento */
  summary: string;
  /** Entidades clave identificadas: profesionales, especialidades, departamentos, servicios */
  entities: string[];
  /** Cómo están organizados los datos: "tabla Día|Horario|Profesional", "prosa legal", etc. */
  structureHint: string;
  /** Reglas específicas de extracción derivadas del contenido: qué campos NO pueden faltar en cada hecho */
  extractionRules: string[];
}

/** Si el documento cabe entero en este límite, se manda completo al análisis. */
const DOC_ANALYSIS_FULL_THRESHOLD = 12_000;
/** Para docs más grandes: cuántos chars tomar de cada zona (inicio / medio / fin). */
const DOC_ANALYSIS_SAMPLE_CHARS = 3_500;

const DOCUMENT_ANALYSIS_PROMPT = `Sos un analizador de documentos para un sistema RAG de la mutual de salud MutuaLyF.

Recibís el comienzo (o la totalidad) de un documento. Tu trabajo es comprenderlo a fondo para que otro proceso pueda extraer hechos de alta calidad.

DEVOLVÉ un JSON estricto con esta estructura exacta:
{
  "docType": "<uno de: schedule | specialist-dir | law-regulation | pricing | procedure | coverage | contact | general>",
  "summary": "<una oración que resume de qué trata el documento>",
  "entities": ["<entidad 1>", "<entidad 2>", ...],
  "structureHint": "<cómo están organizados los datos, ej: 'tabla con columnas Día|Horario|Profesional|Especialidad'>",
  "extractionRules": [
    "<regla 1 específica para este documento>",
    "<regla 2 específica para este documento>"
  ]
}

GUÍA PARA CADA TIPO:
- schedule: horarios de atención, turnos, días de trabajo de profesionales
- specialist-dir: listado de médicos/profesionales con especialidad y datos de contacto
- law-regulation: leyes, decretos, resoluciones, estatutos, artículos legales
- pricing: aranceles, coseguros, precios de prestaciones, valores de cuotas
- procedure: pasos para realizar un trámite, requisitos, instrucciones
- coverage: qué cubre el plan, qué prestaciones incluye, topes, exclusiones
- contact: teléfonos, direcciones, emails, horarios de atención de sucursales
- general: documento mixto que no encaja en ninguno de los anteriores

PARA entities: incluí todos los nombres de profesionales, especialidades médicas, departamentos,
servicios, organismos, leyes mencionadas, o cualquier entidad nombrada explícitamente.

PARA extractionRules: generá entre 2 y 6 reglas MUY ESPECÍFICAS para este documento que le digan
al extractor de hechos qué campos son OBLIGATORIOS en cada hecho. Ejemplos:
- Para un schedule: "Cada hecho de horario DEBE incluir: nombre del profesional, especialidad, día de la semana y horario exacto"
- Para una ley: "Cada hecho legal DEBE incluir: número de artículo/inciso y el texto completo sin parafrasear"
- Para pricing: "Cada hecho de precio DEBE incluir: nombre de la prestación, valor en pesos y condición (ej: con/sin orden)"

SALIDA: solo el JSON, sin texto adicional, sin markdown, sin bloques de código.`;

function buildFactExtractionPrompt(ctx: DocContext): string {
  const rules = ctx.extractionRules.map((r, i) => `${i + 3}. ${r}`).join("\n");
  const entitiesHint =
    ctx.entities.length > 0
      ? `\nENTIDADES CLAVE EN ESTE DOCUMENTO: ${ctx.entities.join(", ")}.`
      : "";

  return `Sos un extractor de hechos para un sistema RAG de la mutual de salud MutuaLyF.

CONTEXTO DEL DOCUMENTO COMPLETO:
- Tipo: ${ctx.docType}
- Resumen: ${ctx.summary}
- Estructura: ${ctx.structureHint}${entitiesHint}

Recibís un FRAGMENTO de ese documento. Tu trabajo es descomponerlo en HECHOS ATÓMICOS y AUTOCONTENIDOS.

REGLAS GENERALES:
1. Cada hecho es una oración (o mini-párrafo) que puede leerse AISLADA y conservar todo el contexto necesario.
2. Para tablas o listas: cada fila es UN hecho. Repetí la clave de grupo. Ej: si hay "## PSICOLOGIA" y luego "Clínica | Lunes | 14-18 | Dra. García", el hecho es: "En el servicio de Psicología Clínica, la Dra. García atiende los lunes de 14 a 18 hs."
${rules}

REGLAS ESTRICTAS:
- NO inventes datos. NO agregues nada que no esté en el fragmento.
- NO resumas hasta perder información — copiá literal: nombres, horarios, precios, números de artículo.
- Cada hecho en español natural, sin markdown, sin pipes "|", sin bullets, sin JSON.

SALIDA: JSON estricto, UN SOLO objeto con la clave "facts" (array de strings). Nada más.

Ejemplo: {"facts":["Hecho uno completo y autocontenido.","Hecho dos completo y autocontenido."]}`;
}

function buildEnrichmentPrompt(reasons: QualityReason[], ctx: DocContext): string {
  const instructions: string[] = [];

  if (reasons.includes("pipe-tables")) {
    instructions.push(
      'TABLAS CON PIPES: Expandí cada fila como una frase completa incluyendo el encabezado de sección como contexto. ' +
        'Ejemplo: "## PSICOLOGÍA\\nClínica | Lunes | 14-18 | Dra. García" → ' +
        '"En el servicio de Psicología Clínica, la Dra. García atiende los lunes de 14 a 18 hs."',
    );
  }

  if (reasons.includes("garbled-text")) {
    instructions.push(
      "TEXTO CON RUIDO: Eliminá caracteres extraños, numeraciones de página y headers repetidos de extracción PDF. " +
        "Reconstruí frases cortadas manteniendo todos los datos concretos.",
    );
  }

  if (reasons.includes("flat-lists")) {
    instructions.push(
      "LISTAS SIN CONTEXTO: Para cada ítem de lista, incluí el encabezado de sección como contexto explícito. " +
        'Ejemplo: bajo "## Documentación requerida", el ítem "DNI" → ' +
        '"Para los trámites, se requiere presentar el DNI."',
    );
  }

  const contextBlock =
    `\nCONTEXTO DEL DOCUMENTO: ${ctx.summary} (tipo: ${ctx.docType}).` +
    (ctx.entities.length > 0
      ? ` Entidades presentes: ${ctx.entities.slice(0, 15).join(", ")}.`
      : "");

  return `Sos un preprocesador de documentos para un sistema RAG de la mutual de salud MutuaLyF.
${contextBlock}

Recibís un fragmento con problemas de formato detectados. Tu trabajo es transformarlo en prosa clara, completa y buscable, SIN inventar datos.

INSTRUCCIONES ESPECÍFICAS:
${instructions.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}

REGLAS GENERALES:
- NO inventes datos, nombres, horarios ni valores.
- Mantené TODOS los datos concretos del original: nombres, fechas, horarios, precios, teléfonos.
- Output en español natural, sin markdown, sin pipes "|", sin bullets, sin JSON.
- Si una sección ya es prosa clara, conservála sin cambios.

SALIDA: solo el texto transformado, sin explicaciones ni metadata.`;
}

function parseDocContext(raw: string): DocContext | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Partial<DocContext>;
    if (typeof obj.summary !== "string") return null;
    return {
      docType: (obj.docType as DocType) ?? "general",
      summary: obj.summary,
      entities: Array.isArray(obj.entities)
        ? obj.entities.filter((e): e is string => typeof e === "string")
        : [],
      structureHint: typeof obj.structureHint === "string" ? obj.structureHint : "",
      extractionRules: Array.isArray(obj.extractionRules)
        ? obj.extractionRules.filter((r): r is string => typeof r === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function analyzeQuality(
  text: string,
  pipeRatio: number,
  noiseRatio: number,
  flatRatio: number,
  flatMinLines: number,
): SegmentQuality {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { needsEnrichment: false, reasons: [] };

  const pipeLines = lines.filter((l) => (l.match(/\|/g)?.length ?? 0) >= 2);
  const hasPipeTables = pipeLines.length / lines.length >= pipeRatio;

  const garbledChars = text.match(/[^\x20-\x7E\xC0-\u02AF\n\r\t]/g)?.length ?? 0;
  const hasGarbledText = garbledChars / text.length >= noiseRatio;

  const shortLines = lines.filter((l) => {
    const len = l.trim().length;
    return len > 5 && len < 80;
  });
  const hasFlatLists =
    lines.length >= flatMinLines && shortLines.length / lines.length >= flatRatio;

  const reasons: QualityReason[] = [];
  if (hasPipeTables) reasons.push("pipe-tables");
  if (hasGarbledText) reasons.push("garbled-text");
  if (hasFlatLists) reasons.push("flat-lists");

  return { needsEnrichment: reasons.length > 0, reasons };
}

/**
 * Divide texto en segmentos respetando siempre límites de línea completa.
 * Estrategia jerárquica: primero intenta agrupar párrafos (\n\n), si un párrafo
 * supera el límite lo parte línea a línea. Nunca corta en mitad de una línea.
 */
function splitAtLineBoundaries(text: string, targetChars: number): string[] {
  // Paso 1: agrupar párrafos en segmentos sin exceder targetChars
  const paragraphs = text.split(/\n{2,}/);
  const segments: string[] = [];
  let buf = "";

  for (const para of paragraphs) {
    const sep = buf ? "\n\n" : "";

    if (para.length > targetChars) {
      // Párrafo demasiado grande: vaciamos el buffer y lo partimos por líneas
      if (buf) { segments.push(buf); buf = ""; }
      segments.push(...splitByLines(para, targetChars));
      continue;
    }

    if (buf.length + sep.length + para.length <= targetChars) {
      buf += sep + para;
    } else {
      if (buf) segments.push(buf);
      buf = para;
    }
  }
  if (buf) segments.push(buf);
  return segments;
}

function splitByLines(text: string, targetChars: number): string[] {
  const lines = text.split("\n");
  const segments: string[] = [];
  let buf = "";

  for (const line of lines) {
    const sep = buf ? "\n" : "";

    if (buf.length + sep.length + line.length <= targetChars) {
      buf += sep + line;
    } else {
      if (buf) segments.push(buf);
      // Línea individual mayor al target: la incluimos igual (no cortamos mid-línea)
      buf = line;
    }
  }
  if (buf) segments.push(buf);
  return segments;
}

function parseFactsJson(raw: string): string[] | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { facts?: unknown };
    if (!Array.isArray(obj.facts)) return null;
    return obj.facts.filter((f): f is string => typeof f === "string");
  } catch {
    return null;
  }
}

@Injectable()
export class SemanticChunkerService {
  private readonly logger = new Logger(SemanticChunkerService.name);

  constructor(
    private readonly groq: GroqService,
    private readonly cfg: RagConfig,
  ) {}

  async split(content: string, category: string, title: string): Promise<string[]> {
    const text = content.replace(/\r\n/g, "\n").trim();
    if (!text) return [];

    // Fase 0: analizar el documento completo para entender su estructura y contexto.
    // Este contexto se inyecta en todos los prompts siguientes para que el LLM
    // sepa qué tipo de información está procesando y qué campos son obligatorios.
    const docCtx = await this.analyzeDocument(text, category, title);
    this.logger.log(
      `"${title}" → docType=${docCtx.docType} entities=${docCtx.entities.length} rules=${docCtx.extractionRules.length}`,
    );

    const segments = this.preSegment(text);
    this.logger.log(
      `"${title}" → ${segments.length} segmento(s), ${text.length} chars total`,
    );

    const out: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      // Delay entre segmentos para no saturar el TPM de Groq en documentos grandes.
      // El delay solo aplica a partir del segundo segmento.
      if (i > 0 && this.cfg.chunkerInterCallDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.cfg.chunkerInterCallDelayMs));
      }

      const seg = segments[i];
      const quality = analyzeQuality(
        seg,
        this.cfg.enrichmentPipeRatio,
        this.cfg.enrichmentNoiseRatio,
        this.cfg.enrichmentFlatRatio,
        this.cfg.enrichmentFlatMinLines,
      );

      const prepared =
        quality.needsEnrichment && this.cfg.enableEnrichment
          ? await this.enrichSegment(seg, quality, category, title, docCtx)
          : seg;

      const facts = await this.extractFacts(prepared, category, title, i + 1, segments.length, docCtx);

      for (const f of facts) {
        const trimmed = f.trim();
        if (trimmed.length < this.cfg.chunkerMinFactChars) continue;
        if (trimmed.length > this.cfg.chunkerMaxFactChars) {
          out.push(...chunkText(trimmed, { chunkSize: 250, chunkOverlap: 40 }));
          continue;
        }
        out.push(trimmed);
      }
    }

    if (out.length === 0) {
      this.logger.warn(
        `"${title}" — LLM no produjo hechos en ningún segmento, usando chunker determinístico`,
      );
      return chunkText(text);
    }

    this.logger.log(`"${title}" → ${out.length} hechos extraídos`);
    return out;
  }

  /**
   * Construye una muestra representativa del documento para el análisis:
   * - Docs cortos (≤ DOC_ANALYSIS_FULL_THRESHOLD): se mandan completos.
   * - Docs largos: inicio + muestra del medio + fin, con separadores claros
   *   para que el LLM entienda que son extractos no contiguos.
   */
  private buildDocPreview(text: string): { preview: string; isFull: boolean } {
    if (text.length <= DOC_ANALYSIS_FULL_THRESHOLD) {
      return { preview: text, isFull: true };
    }

    const s = DOC_ANALYSIS_SAMPLE_CHARS;
    const start = text.slice(0, s);
    const midOffset = Math.floor(text.length / 2) - Math.floor(s / 2);
    const mid = text.slice(midOffset, midOffset + s);
    const end = text.slice(-s);

    const preview =
      `[INICIO DEL DOCUMENTO]\n${start}\n\n` +
      `[... EXTRACTO DEL MEDIO (posición ~${Math.round(midOffset / text.length * 100)}%) ...]\n${mid}\n\n` +
      `[EXTRACTO DEL FINAL]\n${end}`;

    return { preview, isFull: false };
  }

  /**
   * Fase 0 del pipeline de ingesta: analiza el documento completo (o una muestra
   * representativa si es muy largo) y produce un DocContext con tipo, entidades
   * clave y reglas de extracción específicas para este documento.
   * Si el LLM falla, devuelve un contexto vacío (graceful degradation).
   */
  private async analyzeDocument(
    text: string,
    category: string,
    title: string,
  ): Promise<DocContext> {
    const fallback: DocContext = {
      docType: "general",
      summary: title,
      entities: [],
      structureHint: "",
      extractionRules: [],
    };

    const { preview, isFull } = this.buildDocPreview(text);
    const coverageNote = isFull
      ? `Contenido completo (${text.length} chars)`
      : `Extractos representativos — inicio, medio y fin (doc completo: ${text.length} chars)`;

    const userMsg =
      `Documento: "${title}" | Categoría: ${category}\n\n` +
      `${coverageNote}:\n"""\n${preview}\n"""\n\nAnalizá el documento y devolvé el JSON.`;

    try {
      const raw = await this.groq.generateResponse(
        [],
        userMsg,
        DOCUMENT_ANALYSIS_PROMPT,
        0.1,
        512,
        { timeoutMs: this.cfg.docAnalysisTimeoutMs, waitOnRateLimit: true },
      );
      const ctx = parseDocContext(raw);
      if (!ctx) {
        this.logger.warn(`analyzeDocument JSON inválido para "${title}" — usando contexto vacío`);
        return fallback;
      }
      return ctx;
    } catch (e) {
      this.logger.warn(
        `analyzeDocument falló para "${title}": ${(e as Error).message} — usando contexto vacío`,
      );
      return fallback;
    }
  }

  private preSegment(text: string): string[] {
    const targetChars = this.cfg.chunkerSegmentChars;
    const overlapLines = this.cfg.chunkerSegmentOverlapLines;

    if (text.length <= targetChars) return [text];

    const blocks = splitAtLineBoundaries(text, targetChars);

    if (overlapLines <= 0) return blocks;

    // Las últimas N líneas del segmento anterior se repiten al inicio del
    // siguiente para dar continuidad (ej: encabezado de sección + primeras filas).
    const withOverlap: string[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (i === 0) {
        withOverlap.push(blocks[i]);
        continue;
      }
      const prevLines = blocks[i - 1].split("\n");
      const tail = prevLines.slice(-overlapLines).join("\n").trim();
      withOverlap.push(tail ? `${tail}\n${blocks[i]}` : blocks[i]);
    }
    return withOverlap;
  }

  private async enrichSegment(
    segment: string,
    quality: SegmentQuality,
    category: string,
    title: string,
    ctx: DocContext,
  ): Promise<string> {
    const prompt = buildEnrichmentPrompt(quality.reasons, ctx);
    const userMsg =
      `Documento: "${title}" | Categoría: ${category}\n\n` +
      `Fragmento:\n"""\n${segment}\n"""\n\nTransformá el fragmento según las instrucciones.`;

    try {
      const enriched = await this.groq.generateResponse(
        [],
        userMsg,
        prompt,
        0.1,
        this.cfg.enrichmentMaxTokens,
        { timeoutMs: this.cfg.enrichmentTimeoutMs, waitOnRateLimit: true },
      );
      this.logger.debug(
        `enriched "${title}" (reasons: ${quality.reasons.join(", ")}, docType: ${ctx.docType})`,
      );
      return enriched.trim() || segment;
    } catch (e) {
      this.logger.warn(
        `enrichSegment failed for "${title}" [${quality.reasons.join(",")}]: ${(e as Error).message} — usando texto original`,
      );
      return segment;
    }
  }

  private async extractFacts(
    segment: string,
    category: string,
    title: string,
    segIdx: number,
    segTotal: number,
    ctx: DocContext,
  ): Promise<string[]> {
    const label = `"${title}" seg ${segIdx}/${segTotal} (${segment.length} chars, docType=${ctx.docType})`;
    const factPrompt = buildFactExtractionPrompt(ctx);
    const userMsg =
      `Documento: "${title}" | Categoría: ${category}\n\n` +
      `Fragmento:\n"""\n${segment}\n"""\n\nExtraé los hechos atómicos en el JSON indicado.`;

    let raw: string;
    try {
      this.logger.log(`extractFacts → llamando LLM para ${label}`);
      raw = await this.groq.generateResponse(
        [],
        userMsg,
        factPrompt,
        0.1,
        2048,
        { timeoutMs: this.cfg.chunkerTimeoutMs, waitOnRateLimit: true },
      );
    } catch (e) {
      this.logger.warn(
        `extractFacts LLM error en ${label}: ${(e as Error).message} — fallback chunker`,
      );
      return chunkText(segment);
    }

    const facts = parseFactsJson(raw);
    if (!facts) {
      this.logger.warn(
        `extractFacts JSON inválido en ${label} — respuesta LLM: ${raw.slice(0, 200)} — fallback chunker`,
      );
      return chunkText(segment);
    }

    this.logger.log(`extractFacts → ${facts.length} hechos extraídos para ${label}`);
    return facts;
  }
}
