/**
 * Obtiene la IP del usuario
 * En producción debería venir del backend, pero como fallback usamos un servicio externo
 */

let cachedIP: string | null = null;

export async function getUserIP(): Promise<string> {
  // Si ya tenemos la IP en caché, retornarla
  if (cachedIP) {
    return cachedIP;
  }

  try {
    // Intentar obtener de ipify (servicio gratuito y confiable)
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      cache: 'force-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      cachedIP = data.ip;
      console.log(`📍 IP detectada: ${cachedIP}`);
      return cachedIP;
    }
  } catch (error) {
    console.warn('No se pudo obtener IP de ipify:', error);
  }

  // Fallback: usar un identificador basado en el navegador
  cachedIP = 'unknown-' + generateBrowserID();
  return cachedIP;
}

function generateBrowserID(): string {
  // Generar ID único basado en características del navegador
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset()
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

/**
 * Limpia el caché de IP (útil para testing)
 */
export function clearIPCache(): void {
  cachedIP = null;
}
