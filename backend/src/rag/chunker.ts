/**
 * Chunker con respeto de límites de línea.
 *
 * Estrategia:
 *   1. Agrupa párrafos (doble salto) sin exceder targetChars.
 *   2. Si un párrafo es muy grande, lo parte línea a línea — nunca en mitad de línea.
 *   3. Overlap siempre basado en líneas completas del chunk anterior,
 *      no en caracteres, para evitar registros cortados a mitad.
 */
export interface ChunkOptions {
  chunkSize: number;    // tokens objetivo por chunk
  chunkOverlap: number; // tokens de overlap (usado para estimar líneas de overlap)
}

const DEFAULT_OPTS: ChunkOptions = { chunkSize: 500, chunkOverlap: 80 };
const CHARS_PER_TOKEN = 4;
const CHARS_PER_LINE_AVG = 80; // estimación para convertir tokens de overlap a líneas

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkText(
  raw: string,
  opts: Partial<ChunkOptions> = {},
): string[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_OPTS, ...opts };
  const targetChars = chunkSize * CHARS_PER_TOKEN;
  const overlapChars = chunkOverlap * CHARS_PER_TOKEN;
  const overlapLineCount = Math.max(1, Math.round(overlapChars / CHARS_PER_LINE_AVG));

  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  if (text.length <= targetChars) return [text];

  // Fase 1: dividir respetando siempre límites de línea completa
  const blocks = splitAtLineBoundaries(text, targetChars);
  if (blocks.length <= 1) return blocks.filter((c) => c.trim().length > 20);

  // Fase 2: overlap con líneas completas del bloque anterior
  // Garantiza que cada chunk arranque con contexto completo (no registros cortados)
  const result: string[] = [blocks[0]];
  for (let i = 1; i < blocks.length; i++) {
    const prevLines = blocks[i - 1]
      .split("\n")
      .filter((l) => l.trim().length > 0);
    const tailLines = prevLines.slice(-overlapLineCount);
    const tail = tailLines.join("\n");
    result.push(tail ? `${tail}\n${blocks[i]}` : blocks[i]);
  }

  return result.map((c) => c.trim()).filter((c) => c.length > 20);
}

/**
 * Divide texto en bloques respetando siempre límites de línea completa.
 * Primero intenta agrupar párrafos (doble salto); si un párrafo supera el
 * límite, lo parte línea a línea. Nunca corta en mitad de una línea.
 */
function splitAtLineBoundaries(text: string, targetChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const segments: string[] = [];
  let buf = "";

  for (const para of paragraphs) {
    const sep = buf ? "\n\n" : "";

    if (para.length > targetChars) {
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

/**
 * Parte un bloque largo línea a línea sin exceder targetChars.
 * Si una línea individual supera el límite, la incluye igual
 * (no cortamos en mitad de línea en ningún caso).
 */
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
      buf = line;
    }
  }
  if (buf) segments.push(buf);
  return segments;
}
