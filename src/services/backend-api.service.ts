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
   * Analizar orden médica con OCR (paso 1)
   */
  async analyzeMedicalOrder(file: File): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', this.sessionId);

      const response = await fetch(`${BACKEND_URL}/uploads/medical-order/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.message || 'Error al analizar la orden' };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Error analizando orden médica:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }

  /**
   * Subir orden médica con datos validados (paso 2)
   */
  async uploadMedicalOrder(
    file: File,
    orderData: {
      patientDNI: string;
      patientName: string;
      patientPhone: string;
      orderDate: string;
      doctorName: string;
      doctorLicense?: string;
      healthInsurance?: string;
      requestedStudies: string[];
    }
  ): Promise<{ success: boolean; orderId?: number; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', this.sessionId);
      formData.append('patientDNI', orderData.patientDNI);
      formData.append('patientName', orderData.patientName);
      formData.append('patientPhone', orderData.patientPhone);
      formData.append('orderDate', orderData.orderDate);
      formData.append('doctorName', orderData.doctorName);

      if (orderData.doctorLicense) {
        formData.append('doctorLicense', orderData.doctorLicense);
      }

      if (orderData.healthInsurance) {
        formData.append('healthInsurance', orderData.healthInsurance);
      }

      formData.append('requestedStudies', JSON.stringify(orderData.requestedStudies));

      const response = await fetch(`${BACKEND_URL}/uploads/medical-order`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.message || 'Error al subir la orden' };
      }

      const data = await response.json();
      return {
        success: true,
        orderId: data.data?.orderId,
        message: data.message,
      };
    } catch (error) {
      console.error('Error subiendo orden médica:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }
}
