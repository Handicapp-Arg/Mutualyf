import { Injectable, Logger } from "@nestjs/common";
import { GroqService } from "../ai/groq.service";
import { RagConfig } from "./rag.config";
import { chunkText } from "./chunker";

type QualityReason = "pipe-tables" | "garbled-text" | "flat-lists";

interface SegmentQuality {
  needsEnrichment: boolean;
  reasons: QualityReason[];
}

const FACT_EXTRACTION_PROMPT = `Sos un extractor de hechos para un sistema RAG.

Recibís un fragmento de documento de la mutual de salud MutuaLyF. Tu trabajo es descomponerlo en una lista de HECHOS ATÓMICOS y AUTOCONTENIDOS.

REGLAS:
1. Cada hecho es una oración (o mini-párrafo) que puede leerse AISLADA y conservar todo el contexto necesario.
2. Para tablas o listas: cada fila es UN hecho. Repetí la clave de grupo en el hecho. Ejemplo: si hay "## PSICOLOGIA" seguido de "Clínica | Lunes | 14-18 | Dra. García", el hecho es: "En el servicio de Psicología Clínica, la Dra. García atiende los lunes de 14 a 18 hs."
3. Para prosa: partí por idea. Un párrafo denso con varios datos → varios hechos.
4. NO inventes datos. NO agregues nada que no esté explícitamente en el fragmento.
5. NO resumas ni parafrasees hasta perder información — si hay números, nombres, horarios, copialos literal.
6. Cada hecho va en español natural, sin markdown, sin listas anidadas, sin pipes "|".

SALIDA: JSON estricto, UN SOLO objeto con la clave "facts" que es un array de strings. Nada más.

Ejemplo de salida:
{"facts":["Hecho uno completo y autocontenido.","Hecho dos completo y autocontenido."]}`;

function buildEnrichmentPrompt(reasons: QualityReason[]): string {
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

  return `Sos un preprocesador de documentos para un sistema RAG de la mutual de salud MutuaLyF.

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

    const segments = this.preSegment(text);
    this.logger.log(
      `"${title}" → ${segments.length} segmento(s), ${text.length} chars total`,
    );

    const out: string[] = [];

    for (let i = 0; i < segments.length; i++) {
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
          ? await this.enrichSegment(seg, quality, category, title)
          : seg;

      const facts = await this.extractFacts(prepared, category, title, i + 1, segments.length);

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

  private preSegment(text: string): string[] {
    const targetChars = this.cfg.chunkerSegmentChars;
    const overlapLines = this.cfg.chunkerSegmentOverlapLines;

    if (text.length <= targetChars) return [text];

    // Prioridad de corte: bloques separados por 3+ saltos → 2 saltos → 1 salto.
    // Nunca cortamos en mitad de una línea.
    const blocks = splitAtLineBoundaries(text, targetChars);

    if (overlapLines <= 0) return blocks;

    // Agregar overlap: las últimas N líneas del segmento anterior se repiten
    // al inicio del siguiente para que el LLM tenga contexto de continuidad
    // (ej: encabezado de sección + primeras filas de tabla).
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
  ): Promise<string> {
    const prompt = buildEnrichmentPrompt(quality.reasons);
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
        { timeoutMs: this.cfg.enrichmentTimeoutMs },
      );
      this.logger.debug(
        `enriched "${title}" (reasons: ${quality.reasons.join(", ")})`,
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
  ): Promise<string[]> {
    const label = `"${title}" seg ${segIdx}/${segTotal} (${segment.length} chars)`;
    const userMsg =
      `Documento: "${title}" | Categoría: ${category}\n\n` +
      `Fragmento:\n"""\n${segment}\n"""\n\nExtraé los hechos atómicos en el JSON indicado.`;

    let raw: string;
    try {
      this.logger.log(`extractFacts → llamando LLM para ${label}`);
      raw = await this.groq.generateResponse(
        [],
        userMsg,
        FACT_EXTRACTION_PROMPT,
        0.1,
        2048,
        { timeoutMs: this.cfg.chunkerTimeoutMs },
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
