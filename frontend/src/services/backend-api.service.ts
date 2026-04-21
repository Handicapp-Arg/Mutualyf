const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

interface ConversationData {
  userId?: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'admin';
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
    // Generar ID de sesión único solo en memoria
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generar ID de sesión único
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Guardar conversación en el backend
   */
  async saveConversation(
    messages: ConversationData['messages'],
    userName?: string
  ): Promise<void> {
    try {
      const payload = {
        sessionId: this.sessionId,
        userName: userName || 'Anónimo',
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error guardando conversación:', error);
      throw error;
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
   * Subir un archivo adjunto al chat y obtener su metadata.
   */
  async uploadChatAttachment(file: File, description?: string): Promise<{
    success: boolean;
    data?: { id: number; fileName: string; fileType: string; fileSize: number; description?: string | null };
    message?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', this.sessionId);
      if (description && description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await fetch(`${BACKEND_URL}/conversations/attachment`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.message || 'Error al subir archivo' };
      }

      const data = await response.json();
      return { success: true, data: data.data ?? data };
    } catch (error) {
      console.error('Error subiendo archivo adjunto:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }

}
