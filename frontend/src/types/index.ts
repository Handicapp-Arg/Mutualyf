/**
 * Type Definitions - CIOR
 */

/** Metadata de un archivo adjunto en el chat */
export interface ChatAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/** Mensaje de chat completo (usado en UI) */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  timestamp: Date;
  options?: Array<{ label: string; value: string }>;
  attachment?: ChatAttachment;
}

/** Mensaje mínimo para historial de IA (usado en services) */
export interface AIChatMessage {
  role: 'user' | 'assistant' | 'admin';
  content: string;
}
