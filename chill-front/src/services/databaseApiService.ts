/**
 * HTTP Client para comunicarse con el backend Express
 * Reemplaza las llamadas directas a SQLite que no funcionan en el navegador
 */

import axios from 'axios';
const API_BASE_URL = 'http://localhost:3001/api';

export interface UserIdentity {
  id?: number;
  ipAddress: string;
  fingerprint: string;
  userName?: string | null;
  userAgent?: string;
  timezone?: string;
  language?: string;
  firstVisit: string;
  lastVisit: string;
  visitCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id?: number;
  sessionId: string;
  userMessage: string;
  botResponse: string;
  timestamp: string;
  aiModel?: string;
  userFeedback?: boolean;
}

class DatabaseApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Verifica si el backend está disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Backend no disponible:', error);
      return false;
    }
  }

  // ==================== USER IDENTITIES ====================

  /**
   * Busca usuario por fingerprint
   */
  async findUserByFingerprint(fingerprint: string): Promise<UserIdentity | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/fingerprint/${encodeURIComponent(fingerprint)}`);
      const result = response.data;
      if (!result || !result.data) {
        console.log(`👤 Usuario nuevo detectado (fingerprint: ${fingerprint.substring(0, 15)}...)`);
        return null;
      }
      console.log(`✅ Usuario encontrado: ${result.data.userName || 'sin nombre'} (visitCount: ${result.data.visitCount})`);
      return result.data;
    } catch (error: any) {
      if (error.message?.includes('Network Error')) {
        console.error('❌ Backend no disponible - no se puede conectar a http://localhost:3001');
      } else {
        console.error('❌ Error finding user by fingerprint:', error);
      }
      return null;
    }
  }

  /**
   * Busca usuario por IP
   */
  async findUserByIP(ip: string): Promise<UserIdentity | null> {
    try {
      console.log(`🔍 Buscando usuario por IP: ${ip}`);
      const response = await axios.get(`${this.baseUrl}/users/ip/${encodeURIComponent(ip)}`);
      const result = response.data;
      if (!result || !result.data) {
        console.log(`👤 Usuario nuevo (data vacía)`);
        return null;
      }
      console.log(`✅ Usuario encontrado por IP: ${result.data.userName || 'sin nombre'} (ID: ${result.data.id})`);
      return result.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`👤 Usuario nuevo (no encontrado por IP)`);
        return null;
      }
      console.error('❌ Error finding user by IP:', error);
      return null;
    }
  }

  /**
   * Guarda o actualiza identidad de usuario
   */
  async saveUserIdentity(identity: Omit<UserIdentity, 'id' | 'created_at' | 'updated_at'>): Promise<UserIdentity | null> {
    try {
      console.log(`📤 Guardando identidad de usuario:`, identity);
      const response = await axios.post(`${this.baseUrl}/users/identity`, identity);
      const result = response.data;
      console.log(`✅ Identidad guardada en backend:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error saving user identity:', error);
      return null;
    }
  }

  /**
   * Actualiza el nombre de un usuario
   */
  async updateUserName(fingerprint: string, userName: string): Promise<UserIdentity | null> {
    try {
      console.log(`📤 Enviando actualización de nombre: ${userName} para fingerprint: ${fingerprint}`);
      const response = await axios.put(`${this.baseUrl}/users/name`, { fingerprint, userName });
      const result = response.data;
      console.log(`✅ Nombre actualizado en backend:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error updating user name:', error);
      return null;
    }
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Guarda un mensaje en la conversación
   */
  async saveMessage(message: Omit<ConversationMessage, 'id'>): Promise<ConversationMessage | null> {
    try {
      console.log(`📤 Guardando mensaje en conversación:`, message);
      const response = await axios.post(`${this.baseUrl}/conversations`, message);
      const result = response.data;
      console.log(`✅ Mensaje guardado en backend:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error saving message:', error);
      return null;
    }
  }

  /**
   * Actualiza el feedback de la última conversación
   */
  async updateFeedback(sessionId: string, feedback: string): Promise<boolean> {
    try {
      const response = await axios.put(`${this.baseUrl}/conversations/feedback`, { session_id: sessionId, feedback });
      return response.status === 200;
    } catch (error) {
      console.error('Error updating feedback:', error);
      return false;
    }
  }

  // ==================== USER SESSIONS ====================

  /**
   * Guarda o actualiza sesión de usuario
   * Incluye fingerprint e IP para relacionar con UserIdentity
   */
  async saveSession(sessionId: string, userName?: string, fingerprint?: string, ipAddress?: string): Promise<boolean> {
    try {
      console.log(`📤 Guardando sesión: sessionId=${sessionId}, userName=${userName}, fingerprint=${fingerprint?.substring(0,15)}...`);
      await axios.post(`${this.baseUrl}/sessions`, {
        sessionId: sessionId,
        userName: userName,
        lastSeen: new Date().toISOString(),
        fingerprint: fingerprint,
        ipAddress: ipAddress,
      });
      console.log(`✅ Sesión guardada exitosamente`);
      return true;
    } catch (error) {
      console.error('❌ Error saving session:', error);
      return false;
    }
  }

  // ==================== STATS ====================

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getStats(): Promise<{
    totalUsers: number;
    returningUsers: number;
    usersWithNames: number;
    totalConversations: number;
  } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Borra todos los datos de la base de datos
   */
  async resetDatabase(): Promise<{
    success: boolean;
    deletedConversations: number;
    deletedSessions: number;
    deletedUsers: number;
    total: number;
  } | null> {
    try {
      console.log('🗑️ Iniciando borrado de base de datos...');
      const response = await axios.delete(`${this.baseUrl}/reset-database`);
      const result = response.data;
      console.log('✅ Base de datos limpiada:', result);
      return result.data;
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      return null;
    }
  }

  // ==================== UTILITY ====================

  /**
   * Genera un ID de sesión único
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Exportar instancia singleton
const databaseApiService = new DatabaseApiService();
export default databaseApiService;
