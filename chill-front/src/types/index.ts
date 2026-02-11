export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  timestamp?: Date;
  confidence?: number;
  userSession?: string;
}

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.0-flash-exp' | 'gemini-3-pro-preview';

// Types para el sistema de identificación de usuarios
export interface UserRequest {
  ip: string;
  userAgent: string;
  headers: Record<string, string>;
  timestamp?: Date;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface DatabaseMessage {
  session_id: string;
  user_name: string | null;
  user_message: string;
  bot_response: string;
  timestamp: string;
  confidence?: number;
  metadata?: Record<string, any>;
}
