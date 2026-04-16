const INJECTION_PATTERNS: RegExp[] = [
  /ignor[aáe]\s+(todas|las|el|la|tus|sus)?\s*(instrucc\w*|reglas|prompt\w*|anterior\w*|previas?)/gi,
  /\bsystem\s*:\s*/gi,
  /act[úu]a\s+como\b/gi,
  /olvid[aáe]\s+(todo|lo\s+anterior|las\s+reglas)/gi,
  /\[\[[\s\S]*?\]\]/g,
  /<\s*\/?\s*(system|instruction|prompt)\s*>/gi,
  /disregard\s+(all\s+)?previous/gi,
  /you\s+are\s+now\b/gi,
];

const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

export function sanitizeChunk(text: string): string {
  let t = text;
  for (const re of INJECTION_PATTERNS) t = t.replace(re, "[redacted]");
  t = t.replace(ZERO_WIDTH, "");
  return t.trim();
}

export function escapeXmlAttr(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}
