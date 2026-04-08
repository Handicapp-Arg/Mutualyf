/**
 * Utilidades de helpers reutilizables
 */

/**
 * Calcular porcentaje
 */
export function calculatePercentage(part: number, total: number): string {
  if (total === 0) return '0%';
  return ((part / total) * 100).toFixed(2) + '%';
}

/**
 * Validar y parsear número
 */
export function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Sanitizar texto (eliminar caracteres peligrosos)
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/\0/g, ''); // Eliminar null bytes
}

/**
 * Generar timestamp ISO
 */
export function getISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calcular fecha hace N días
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Formatear error para logging
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * Validar formato de fingerprint
 */
export function isValidFingerprint(fingerprint: string): boolean {
  return (
    typeof fingerprint === 'string' &&
    fingerprint.length >= 10 &&
    fingerprint.length <= 200
  );
}

/**
 * Validar formato de IP
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
