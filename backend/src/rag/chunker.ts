/**
 * Recursive text splitter — aproximación simple y efectiva para RAG.
 * Divide jerárquicamente por \n\n → \n → ". " → " ", con overlap.
 * tokens estimados como chars/4 (heurística estándar es:en/español).
 */
export interface ChunkOptions {
  chunkSize: number; // tokens objetivo
  chunkOverlap: number; // tokens de overlap
}

const DEFAULT_OPTS: ChunkOptions = { chunkSize: 500, chunkOverlap: 80 };
const CHARS_PER_TOKEN = 4;

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

  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  if (text.length <= targetChars) return [text];

  const separators = ["\n\n", "\n", ". ", " "];
  const pieces = splitRecursive(text, separators, targetChars);

  const chunks: string[] = [];
  let current = "";
  for (const p of pieces) {
    if (current.length + p.length + 1 <= targetChars) {
      current += (current ? " " : "") + p;
    } else {
      if (current) chunks.push(current);
      if (overlapChars > 0 && current.length > overlapChars) {
        const tail = current.slice(-overlapChars);
        current = tail + " " + p;
      } else {
        current = p;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.map((c) => c.trim()).filter((c) => c.length > 20);
}

function splitRecursive(
  text: string,
  seps: string[],
  target: number,
): string[] {
  if (text.length <= target) return [text];
  if (seps.length === 0) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += target)
      out.push(text.slice(i, i + target));
    return out;
  }
  const [sep, ...rest] = seps;
  const parts = text.split(sep);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= target) out.push(p);
    else out.push(...splitRecursive(p, rest, target));
  }
  return out;
}
