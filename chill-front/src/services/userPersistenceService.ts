/**
 * Servicio de Persistencia de Usuario
 * Maneja la detección y guardado de nombres de usuario
 * 
 * Utiliza sistema inteligente de detección basado en contexto conversacional
 */

import databaseApiService from './databaseApiService';
import { extraerNombre } from '../config/prompt-system';

// ============================================================================
// ESTADO EN MEMORIA
// ============================================================================

// Almacena datos del usuario actual
let currentFingerprint: string | null = null;
let currentUserName: string | null = null;
let currentIP: string | null = null;

// Contexto conversacional para detección inteligente de nombres
let lastBotMessage: string | null = null;

// ============================================================================
// GESTIÓN DE DATOS EN MEMORIA
// ============================================================================

/**
 * Limpia todos los datos de usuario en memoria
 */
export function clearUserData(): void {
  currentFingerprint = null;
  currentUserName = null;
  currentIP = null;
  lastBotMessage = null;
  console.log('🧹 Datos de usuario limpiados de memoria');
}

/**
 * Establece el fingerprint del usuario actual
 */
export function setUserFingerprint(fingerprint: string): void {
  currentFingerprint = fingerprint;
  console.log(`🔑 Fingerprint establecido: ${fingerprint.substring(0, 20)}...`);
}

/**
 * Establece la IP del usuario actual
 */
export function setUserIP(ip: string): void {
  currentIP = ip;
  console.log(`🌐 IP establecida: ${ip}`);
}

/**
 * Establece el nombre del usuario actual (desde la sesión)
 */
export function setCurrentUserName(name: string | null): void {
  currentUserName = name;
  if (name) {
    console.log(`👤 Nombre de usuario cargado: ${name}`);
  }
}

/**
 * Obtiene el nombre del usuario actual
 */
export function getCurrentUserName(): string | null {
  return currentUserName;
}

/**
 * Obtiene el fingerprint actual
 */
export function getCurrentFingerprint(): string | null {
  return currentFingerprint;
}

/**
 * Obtiene la IP actual
 */
export function getCurrentIP(): string | null {
  return currentIP;
}

/**
 * Detecta y persiste el nombre del usuario si se menciona en el mensaje
 * Usa análisis contextual: considera si el bot preguntó el nombre
 * @param message Mensaje del usuario
 * @param previousBotMessage Mensaje anterior del bot (para contexto)
 * @returns El nombre detectado o null
 */
export async function detectAndSaveUserName(
  message: string, 
  previousBotMessage?: string
): Promise<string | null> {
  // Si ya tenemos nombre, no buscar más
  if (currentUserName) {
    return currentUserName;
  }

  // Usar el mensaje del bot proporcionado o el almacenado
  const botContext = previousBotMessage ?? lastBotMessage;
  
  // Intentar extraer nombre usando detección inteligente
  const nombreDetectado = extraerNombre(message, botContext ?? undefined);
  
  if (nombreDetectado && currentFingerprint) {
    console.log(`📝 Nombre detectado en mensaje: "${nombreDetectado}"`);
    
    // Guardar en memoria
    currentUserName = nombreDetectado;
    
    // Persistir en base de datos
    try {
      const result = await databaseApiService.updateUserName(currentFingerprint, nombreDetectado);
      if (result) {
        console.log(`✅ Nombre "${nombreDetectado}" guardado en base de datos`);
      }
    } catch (error) {
      console.error('❌ Error guardando nombre en DB:', error);
    }
    
    return nombreDetectado;
  }
  
  return null;
}

/**
 * Actualiza el contexto con el último mensaje del bot
 * Llamar después de cada respuesta del bot para mejorar detección de nombres
 */
export function updateBotContext(botMessage: string): void {
  lastBotMessage = botMessage;
}

/**
 * Fuerza el guardado de un nombre específico
 */
export async function saveUserName(name: string): Promise<boolean> {
  if (!currentFingerprint) {
    console.error('❌ No hay fingerprint establecido');
    return false;
  }
  
  currentUserName = name;
  
  try {
    const result = await databaseApiService.updateUserName(currentFingerprint, name);
    if (result) {
      console.log(`✅ Nombre "${name}" guardado en base de datos`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error guardando nombre:', error);
  }
  
  return false;
}

/**
 * Guarda una conversación en la base de datos
 */
export async function saveConversation(
  sessionId: string,
  userMessage: string,
  botResponse: string,
  aiModel?: string
): Promise<void> {
  try {
    await databaseApiService.saveMessage({
      sessionId,
      userMessage,
      botResponse,
      timestamp: new Date().toISOString(),
      aiModel,
    });
    console.log(`💬 Conversación guardada en DB`);
  } catch (error) {
    console.error('❌ Error guardando conversación:', error);
  }
}
