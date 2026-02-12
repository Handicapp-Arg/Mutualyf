// User and conversation types for the app

export interface UserSession {
  readonly id: string;
  readonly fingerprint: string;
  readonly ip: string;
  readonly userAgent: string;
  readonly timezone: string;
  readonly language: string;
  readonly screenResolution: string;
  name?: string;
  email?: string;
  preferences: UserPreferences;
  conversationHistory: ConversationMessage[];
  readonly firstVisit: Date;
  lastActivity: Date;
  isReturningUser: boolean;
  confidence: number;
  nameAsked?: boolean;
}

export interface UserPreferences {
  responseStyle: 'formal' | 'casual' | 'technical';
  language: string;
  timezone: string;
  topics: string[];
  customPrompts?: string[];
}

export interface ConversationMessage {
  readonly id: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly isUser: boolean;
  nameExtracted?: string;
  context?: Record<string, any>;
}

export interface NameExtractionResult {
  extractedName?: string;
  confidence: number;
  method?: 'direct_introduction' | 'conversation_context' | 'email_signature' | 'informal_mention';
  suggestedPrompt?: string;
  metadata?: Record<string, any>;
  context?: string;
}
