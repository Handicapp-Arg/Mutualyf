/**
 * Type Definitions - CIOR
 */

/** Mensaje de chat completo (usado en UI) */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: Array<{ label: string; value: string }>;
}

/** Mensaje mínimo para historial de IA (usado en services) */
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
