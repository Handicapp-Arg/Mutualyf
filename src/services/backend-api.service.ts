/**
 * Servicio para comunicación con el backend de Chill
 */

// @ts-ignore - Vite env variables
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001/api';

interface ConversationData {
  userId?: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

/**
 * Servicio para guardar conversaciones en el backend
 */
export class BackendAPIService {
  private sessionId: string;

  constructor() {
    // Generar ID de sesión único o recuperar de localStorage
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Obtener o crear ID de sesión
   */
  private getOrCreateSessionId(): string {
    const stored = localStorage.getItem('cior_session_id');
    if (stored) return stored;

    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cior_session_id', newId);
    return newId;
  }

  /**
   * Guardar conversación en el backend
   */
  async saveConversation(messages: ConversationData['messages']): Promise<void> {
    try {
      const payload = {
        sessionId: this.sessionId,
        messages,
        timestamp: new Date(),
      };

      const response = await fetch(`${BACKEND_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('Error guardando conversación:', response.status);
      }
    } catch (error) {
      // Fallar silenciosamente - el chat funciona sin backend
      console.warn('Backend no disponible para guardar conversación');
    }
  }

  /**
   * Recuperar historial de conversación
   */
  async getConversationHistory(): Promise<ConversationData['messages']> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/session/${this.sessionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.warn('No se pudo recuperar historial:', error);
      return [];
    }
  }

  /**
   * Enviar feedback sobre una respuesta
   */
  async sendFeedback(
    messageId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          messageId,
          rating,
          comment,
          timestamp: new Date(),
        }),
      });
    } catch (error) {
      console.warn('Error enviando feedback:', error);
    }
  }

  /**
   * Subir orden médica
   */
  async uploadMedicalOrder(file: File): Promise<{ success: boolean; fileId?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', this.sessionId);

      const response = await fetch(`${BACKEND_URL}/uploads/medical-order`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false };
      }

      const data = await response.json();
      return { success: true, fileId: data.fileId };
    } catch (error) {
      console.error('Error subiendo orden médica:', error);
      return { success: false };
    }
  }
}
