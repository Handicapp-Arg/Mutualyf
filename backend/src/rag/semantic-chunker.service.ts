import { Injectable, Logger } from "@nestjs/common";
import { GroqService } from "../ai/groq.service";
import { chunkText } from "./chunker";

/**
 * Chunker semántico: descompone un documento en una lista de hechos atómicos
 * y autocontenidos usando un LLM. Reemplaza al chunker ciego por caracteres
 * y al preprocessor heurístico de tablas aplastadas.
 *
 * Contrato: cada chunk de salida es una oración (o mini-párrafo) que puede
 * leerse aislada y conserva TODO el contexto necesario para responder una
 * pregunta puntual. Para tablas, cada fila se expande a un chunk autocontenido
 * que repite la clave de grupo ("En Psicología, la Dra. X atiende los lunes…").
 *
 * El LLM se llama por segmento: el documento se pre-parte en segmentos grandes
 * por límites naturales (\n\n\n o headers) y cada segmento va al LLM. Esto
 * mantiene las llamadas bajo el timeout de 15s aun para docs de cientos de KB.
 *
 * Fallback: ante cualquier error del LLM (timeout, JSON inválido, rate limit),
 * la salida degrada al chunker determinístico `chunkText()`. Ingest nunca
 * bloquea por el LLM.
 */

const SEGMENT_TARGET_CHARS = 6_000;
const MIN_FACT_CHARS = 15;
const MAX_FACT_CHARS = 1_200;

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

interface FactsResponse {
  facts: string[];
}

@Injectable()
export class SemanticChunkerService {
  private readonly logger = new Logger(SemanticChunkerService.name);

  constructor(private readonly groq: GroqService) {}

  async split(content: string, category: string, title: string): Promise<string[]> {
    const text = content.replace(/\r\n/g, "\n").trim();
    if (!text) return [];

    const segments = this.preSegment(text);
    const out: string[] = [];

    for (const seg of segments) {
      const facts = await this.extractFacts(seg, category, title);
      for (const f of facts) {
        const trimmed = f.trim();
        if (trimmed.length < MIN_FACT_CHARS) continue;
        if (trimmed.length > MAX_FACT_CHARS) {
          out.push(...chunkText(trimmed, { chunkSize: 250, chunkOverlap: 40 }));
          continue;
        }
        out.push(trimmed);
      }
    }

    if (out.length === 0) {
      this.logger.warn(
        `SemanticChunker no produjo hechos para "${title}" — degradando a chunker determinístico`,
      );
      return chunkText(text);
    }
    return out;
  }

  private preSegment(text: string): string[] {
    if (text.length <= SEGMENT_TARGET_CHARS) return [text];

    const byTripleNewline = text.split(/\n{3,}/);
    const segments: string[] = [];
    let buf = "";
    for (const part of byTripleNewline) {
      if (!buf) {
        buf = part;
        continue;
      }
      if (buf.length + part.length + 2 <= SEGMENT_TARGET_CHARS) {
        buf += "\n\n" + part;
      } else {
        segments.push(buf);
        buf = part;
      }
    }
    if (buf) segments.push(buf);

    const final: string[] = [];
    for (const s of segments) {
      if (s.length <= SEGMENT_TARGET_CHARS) final.push(s);
      else final.push(...chunkText(s, { chunkSize: SEGMENT_TARGET_CHARS / 4, chunkOverlap: 0 }));
    }
    return final;
  }

  private async extractFacts(
    segment: string,
    category: string,
    title: string,
  ): Promise<string[]> {
    const userMsg = `Documento: "${title}" | Categoría: ${category}\n\nFragmento:\n"""\n${segment}\n"""\n\nExtraé los hechos atómicos en el JSON indicado.`;
    try {
      const raw = await this.groq.generateResponse(
        [],
        userMsg,
        FACT_EXTRACTION_PROMPT,
        0.1,
        2048,
      );
      const parsed = parseFactsJson(raw);
      return parsed ?? chunkText(segment);
    } catch (e) {
      this.logger.warn(
        `extractFacts falló (title="${title}"): ${(e as Error).message} — fallback chunker`,
      );
      return chunkText(segment);
    }
  }
}

function parseFactsJson(raw: string): string[] | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Partial<FactsResponse>;
    if (!obj || !Array.isArray(obj.facts)) return null;
    return obj.facts.filter((f): f is string => typeof f === "string");
  } catch {
    return null;
  }
}
