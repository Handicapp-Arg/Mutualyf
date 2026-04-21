/**
 * Normalización canónica de texto para búsqueda y comparación.
 * Usado en cache keys, FTS, router y filtros off-topic.
 *
 * Aplica en orden:
 *   1. Trim
 *   2. Minúsculas
 *   3. NFD + eliminación de diacríticos (acentos, tildes, diéresis)
 *   4. Colapso de espacios múltiples
 *
 * NO elimina puntuación ni caracteres especiales — eso corresponde
 * a cada consumidor según su necesidad (FTS, cache key, etc).
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Versión para FTS: además elimina caracteres no alfanuméricos.
 * Produce tokens aptos para tsquery de PostgreSQL.
 */
export function normalizeForFts(text: string): string {
  return normalizeText(text).replace(/[^a-z0-9\s]/g, " ");
}
