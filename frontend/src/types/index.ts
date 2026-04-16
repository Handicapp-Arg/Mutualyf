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

/** Conversación completa con historial */
export interface Conversation {
  id: string;
  sessionId: string;
  userName?: string;
  messages: ChatMessage[];
  timestamp: Date;
}

/** Archivo subido al chat */
export interface UploadedFile {
  id: number;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string | null;
  uploadedBy: 'user' | 'admin';
  createdAt: string;
}

/** Estadísticas del dashboard */
export interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalUploads: number;
  avgMessagesPerConversation: number;
}

/** Sesión de usuario en vivo */
export interface LiveSession {
  sessionId: string;
  userName?: string | null;
  lastSeen: string;
}

/** Documento de la base de conocimiento RAG */
export interface KnowledgeDoc {
  id: number;
  title: string;
  source: string;
  category: string;
  status: string;
  version: number;
  tokensTotal: number;
  createdAt: string;
  archivedAt: string | null;
  _count: { chunks: number };
}

/** Categorías RAG disponibles */
export const RAG_CATEGORIES = [
  { value: 'contact', label: 'Contacto' },
  { value: 'services', label: 'Servicios' },
  { value: 'payments', label: 'Pagos' },
  { value: 'meds', label: 'Medicamentos' },
  { value: 'procedure', label: 'Trámites' },
  { value: 'legal', label: 'Legal' },
  { value: 'platform', label: 'Plataforma' },
  { value: 'general', label: 'General' },
] as const;
