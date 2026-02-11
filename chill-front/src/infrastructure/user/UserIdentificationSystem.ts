// Sistema de Identificación de Usuario Inteligente - OPTIMIZADO
import type { UserSession } from '../../types/user';
import databaseApiService from '../../services/databaseApiService';

// 🚀 CONSTANTES PARA MEJOR PERFORMANCE
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 días para recordar usuarios
const STORAGE_KEY = 'chat_user_sessions'; // Key para localStorage

export class UserIdentificationSystem {
  private readonly activeSessions: Map<string, UserSession> = new Map();
  private readonly fingerprints: Map<string, string> = new Map();
  
  constructor() {
    this.loadSessionsFromStorage(); // 🚀 Cargar sesiones guardadas
  }

  destroy(): void {
    // Método disponible para limpieza futura si es necesario
  }

  // Crear o recuperar sesión de usuario
  async identifyUser(request: {
    ip: string;
    userAgent: string;
    headers: Record<string, string>;
  }): Promise<UserSession> {
    const fingerprint = this.generateFingerprint(request);
    
    // ═══════════════════════════════════════════════════════════════
    // FLUJO DE IDENTIFICACIÓN (Prioridad: DB > localStorage > Nuevo)
    // ═══════════════════════════════════════════════════════════════
    
    // 1. PRIMERO: Buscar en BASE DE DATOS por IP (más confiable)
    console.log(`🔍 [1/3] Buscando usuario en DB por IP: ${request.ip}`);
    let dbUser = await databaseApiService.findUserByIP(request.ip);
    
    // 2. Si no está por IP, buscar en DB por fingerprint
    if (!dbUser) {
      console.log(`🔍 [2/3] No encontrado por IP, buscando en DB por fingerprint...`);
      dbUser = await databaseApiService.findUserByFingerprint(fingerprint);
    }
    
    // ✅ ENCONTRADO EN BASE DE DATOS
    if (dbUser) {
      console.log(`✅ Usuario encontrado en DB: ${dbUser.userName || 'Sin nombre'} (${dbUser.visitCount} visitas)`);
      
      // 🔑 Reutilizar sessionId existente si hay uno guardado para este fingerprint
      let sessionId = this.fingerprints.get(fingerprint);
      if (!sessionId) {
        sessionId = this.generateSessionId();
        console.log(`🆔 Nuevo sessionId generado: ${sessionId}`);
      } else {
        console.log(`🔄 Reutilizando sessionId existente: ${sessionId}`);
      }
      
      const session: UserSession = {
        id: sessionId,
        fingerprint: fingerprint,
        ip: dbUser.ipAddress,
        userAgent: dbUser.userAgent || request.userAgent,
        timezone: dbUser.timezone || this.extractTimezone(request.headers),
        language: dbUser.language || this.extractLanguage(request.headers),
        screenResolution: 'unknown',
        name: dbUser.userName,  // ← Nombre desde la DB
        preferences: {
          responseStyle: 'casual',
          language: dbUser.language || 'es',
          timezone: dbUser.timezone || 'UTC',
          topics: []
        },
        conversationHistory: [],
        firstVisit: new Date(dbUser.firstVisit),
        lastActivity: new Date(),
        isReturningUser: dbUser.visitCount! > 1,
        confidence: dbUser.userName ? 0.9 : 0.7
      };

      // Guardar en memoria y localStorage
      this.activeSessions.set(sessionId, session);
      this.fingerprints.set(fingerprint, sessionId);
      this.saveSessionsToStorage();
      
      // Actualizar última visita en DB
      await databaseApiService.saveUserIdentity({
        ipAddress: request.ip,
        fingerprint: fingerprint,
        userName: dbUser.userName || undefined,
        userAgent: request.userAgent,
        timezone: this.extractTimezone(request.headers),
        language: this.extractLanguage(request.headers),
        firstVisit: dbUser.firstVisit || new Date().toISOString(),
        lastVisit: new Date().toISOString()
      });
      
      // 🔄 Crear/actualizar UserSession para usuario que retorna de DB
      await databaseApiService.saveSession(sessionId, dbUser.userName || undefined, fingerprint, request.ip);
      console.log(`✅ UserSession creada/actualizada para usuario de DB: ${sessionId}`);
      
      return session;
    }
    
    // 3. NO está en DB → Verificar localStorage (solo como fallback)
    console.log(`🔍 [3/3] No encontrado en DB, verificando localStorage...`);
    let sessionId = this.fingerprints.get(fingerprint);
    let session = sessionId ? this.activeSessions.get(sessionId) : undefined;

    if (session && session.name) {
      // Hay datos en localStorage - sincronizar con DB
      console.log(`📦 Usuario en localStorage: ${session.name} - Sincronizando con DB...`);
      session.lastActivity = new Date();
      session.isReturningUser = true;
      
      // Guardar en base de datos para persistencia
      await databaseApiService.saveUserIdentity({
        ipAddress: request.ip,
        fingerprint: fingerprint,
        userName: session.name,
        userAgent: request.userAgent,
        timezone: session.timezone,
        language: session.language,
        firstVisit: session.firstVisit.toISOString(),
        lastVisit: new Date().toISOString()
      });
      
      // 🔄 Crear/actualizar UserSession para usuario de localStorage
      await databaseApiService.saveSession(sessionId!, session.name, fingerprint, request.ip);
      console.log(`✅ UserSession creada/actualizada para usuario de localStorage: ${sessionId}`);
      
      this.saveSessionsToStorage();
      return session;
    }

    // 4. USUARIO COMPLETAMENTE NUEVO
    console.log(`🆕 Usuario nuevo - Creando sesión...`);
    sessionId = this.generateSessionId();
    const now = new Date();
    session = {
      id: sessionId,
      fingerprint,
      ip: request.ip,
      userAgent: request.userAgent,
      timezone: this.extractTimezone(request.headers),
      language: this.extractLanguage(request.headers),
      screenResolution: 'unknown',
      preferences: {
        responseStyle: 'casual',
        language: this.extractLanguage(request.headers) || 'es',
        timezone: this.extractTimezone(request.headers) || 'UTC',
        topics: []
      },
      conversationHistory: [],
      firstVisit: now,
      lastActivity: now,
      isReturningUser: false,
      confidence: 0.6
    };

    this.activeSessions.set(sessionId, session);
    this.fingerprints.set(fingerprint, sessionId);
    
    // Guardar UserIdentity en base de datos
    await databaseApiService.saveUserIdentity({
      ipAddress: request.ip,
      fingerprint: fingerprint,
      userAgent: request.userAgent,
      timezone: session.timezone,
      language: session.language,
      firstVisit: now.toISOString(),
      lastVisit: now.toISOString()
    });
    
    // 🆕 Guardar UserSession para TODOS los visitantes
    await databaseApiService.saveSession(sessionId, undefined, fingerprint, request.ip);
    console.log(`✅ UserSession creada para nuevo visitante: ${sessionId}`);
    
    this.saveSessionsToStorage();
    return session;
  }

  // Obtener la sesión actual (última activa)
  getCurrentSession(): UserSession | null {
    if (this.activeSessions.size === 0) return null;
    // Buscar la sesión con la última actividad
    let latest: UserSession | null = null;
    let latestTime = 0;
    for (const session of this.activeSessions.values()) {
      if (session.lastActivity.getTime() > latestTime) {
        latest = session;
        latestTime = session.lastActivity.getTime();
      }
    }
    return latest;
  }

  // Métodos auxiliares privados
  private generateFingerprint(request: any): string {
    // Usar solo la IP como identificador único (más simple y consistente)
    const ip = request.ip || 'unknown';
    const fingerprint = `fp_${ip.replace(/\./g, '')}`;
    
    console.log(`🔑 Fingerprint generado basado en IP: ${fingerprint}`);
    return fingerprint;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTimezone(headers: Record<string, string>): string {
    // Intentar extraer timezone de headers
    return headers['x-timezone'] || headers['timezone'] || 'UTC';
  }

  private extractLanguage(headers: Record<string, string>): string {
    const acceptLanguage = headers['accept-language'] || '';
    if (acceptLanguage.includes('es')) return 'es';
    if (acceptLanguage.includes('en')) return 'en';
    return 'es'; // Default español
  }

  // 💾 PERSISTENCIA EN LOCALSTORAGE
  
  /**
   * Guardar sesiones en localStorage para persistencia
   */
  private saveSessionsToStorage(): void {
    try {
      const sessions = Array.from(this.activeSessions.entries());
      const serializable = sessions.map(([id, session]) => {
        // Validar fechas antes de serializar
        const firstVisit = session.firstVisit instanceof Date && !isNaN(session.firstVisit.getTime())
          ? session.firstVisit.toISOString()
          : new Date().toISOString();
        
        const lastActivity = session.lastActivity instanceof Date && !isNaN(session.lastActivity.getTime())
          ? session.lastActivity.toISOString()
          : new Date().toISOString();

        return [
          id,
          {
            ...session,
            firstVisit,
            lastActivity,
            conversationHistory: session.conversationHistory.map(msg => ({
              ...msg,
              timestamp: msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime())
                ? msg.timestamp.toISOString()
                : new Date().toISOString()
            }))
          }
        ];
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error saving sessions to storage:', error);
    }
  }

  /**
   * Cargar sesiones desde localStorage
   */
  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const sessions = JSON.parse(stored);
      const now = Date.now();

      sessions.forEach(([id, sessionData]: [string, any]) => {
        // Verificar que la sesión no esté expirada
        const lastActivity = new Date(sessionData.lastActivity);
        if (now - lastActivity.getTime() < SESSION_TIMEOUT) {
          const session: UserSession = {
            ...sessionData,
            firstVisit: new Date(sessionData.firstVisit),
            lastActivity: new Date(sessionData.lastActivity),
            conversationHistory: sessionData.conversationHistory.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          };

          this.activeSessions.set(id, session);
          this.fingerprints.set(session.fingerprint, id);
        }
      });

      console.log(`✅ Loaded ${this.activeSessions.size} sessions from storage`);
    } catch (error) {
      console.error('Error loading sessions from storage:', error);
    }
  }
}