import { GeminiService } from './geminiService';
import { GroqService } from './groqService';
import { OllamaService, OllamaServiceError } from './ollamaService';
import { ChatMessage } from '../types';
import { env } from '../config/env';
import { 
  detectarIntencion, 
  RESPUESTAS_SEGURAS,
  corregirRespuesta 
} from '../config/prompt-system';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type AIProvider = 'ollama' | 'gemini' | 'groq' | 'fallback';

interface AIServiceConfig {
  systemInstruction: string;
}

interface ProviderResult {
  provider: AIProvider;
  success: boolean;
  error?: Error;
}

// ============================================================================
// ORQUESTADOR PRINCIPAL
// ============================================================================

export class AIServiceOrchestrator {
  private readonly ollamaService: OllamaService;
  private readonly geminiService?: GeminiService;
  private readonly groqService?: GroqService;
  
  private currentProvider: AIProvider = 'ollama';
  private isOllamaAvailable: boolean = false;
  private lastUserName: string | null = null;

  constructor(private readonly config: AIServiceConfig) {
    // Inicializar servicios
    this.ollamaService = new OllamaService(env.ollamaUrl, env.ollamaModel);
    
    if (env.geminiApiKey) {
      this.geminiService = new GeminiService(
        env.geminiApiKey,
        'gemini-2.5-flash',
        config.systemInstruction
      );
    }
    
    if (env.groqApiKey) {
      this.groqService = new GroqService(
        env.groqApiKey,
        'llama-3.3-70b-versatile',
        config.systemInstruction
      );
    }

    this.initialize();
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  stopGeneration(): void {
    this.ollamaService.stopGeneration();
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Stream chat con fallback automático entre proveedores
   * Orden: Ollama → Gemini → Groq → Respuestas predefinidas
   */
  async *streamChat(
    history: ChatMessage[],
    userMessage: string,
    userRequest?: any,
    userName?: string
  ): AsyncGenerator<string> {
    const filteredHistory = history.filter(msg => !msg.id.startsWith('welcome'));
    
    // Guardar nombre para fallback
    if (userName) {
      this.lastUserName = userName;
      this.ollamaService.setUserName(userName);
    }

    // Intentar cada proveedor en orden
    const providers = this.getProviderChain();
    
    for (const provider of providers) {
      try {
        yield* this.streamWithProvider(provider, filteredHistory, userMessage, userRequest, userName);
        return; // Éxito, salir
      } catch (error) {
        this.logProviderError(provider, error);
        continue; // Intentar siguiente proveedor
      }
    }

    // Último recurso: respuestas predefinidas
    console.log('🆘 Todos los proveedores fallaron, usando respuestas predefinidas');
    yield this.getFallbackResponse(userMessage);
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - INICIALIZACIÓN
  // ============================================================================

  private async initialize(): Promise<void> {
    this.isOllamaAvailable = await this.ollamaService.isAvailable();
    
    if (this.isOllamaAvailable) {
      this.currentProvider = 'ollama';
      await this.ollamaService.warmup();
      console.log('🦙 ✅ Ollama inicializado (LOCAL, GRATIS)');
    } else if (this.geminiService) {
      this.currentProvider = 'gemini';
      console.log('☁️ ⚠️ Ollama no disponible, usando Gemini');
    } else if (this.groqService) {
      this.currentProvider = 'groq';
      console.log('☁️ ⚠️ Usando Groq como principal');
    } else {
      this.currentProvider = 'fallback';
      console.warn('⚠️ Sin servicios de IA disponibles, usando respuestas predefinidas');
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - CADENA DE FALLBACK
  // ============================================================================

  private getProviderChain(): AIProvider[] {
    const chain: AIProvider[] = [];
    
    // Agregar proveedores disponibles en orden de prioridad
    if (this.isOllamaAvailable) {
      chain.push('ollama');
    }
    
    if (this.geminiService) {
      chain.push('gemini');
    }
    
    if (this.groqService) {
      chain.push('groq');
    }
    
    return chain;
  }

  private async *streamWithProvider(
    provider: AIProvider,
    history: ChatMessage[],
    userMessage: string,
    userRequest?: any,
    userName?: string
  ): AsyncGenerator<string> {
    this.currentProvider = provider;
    
    switch (provider) {
      case 'ollama':
        console.log('🦙 Intentando Ollama (Local)');
        yield* this.ollamaService.streamChat(
          history,
          userMessage,
          this.config.systemInstruction,
          userName
        );
        break;
        
      case 'gemini':
        if (!this.geminiService) throw new Error('Gemini no disponible');
        console.log('☁️ Intentando Gemini (Cloud)');
        yield* this.geminiService.streamChat(history, userMessage, userRequest);
        break;
        
      case 'groq':
        if (!this.groqService) throw new Error('Groq no disponible');
        console.log('☁️ Intentando Groq (Cloud)');
        yield* this.streamWithGroq(history, userMessage);
        break;
        
      default:
        throw new Error(`Proveedor desconocido: ${provider}`);
    }
  }

  private async *streamWithGroq(
    history: ChatMessage[],
    userMessage: string
  ): AsyncGenerator<string> {
    const conversationHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.text
    }));
    conversationHistory.push({ role: 'user', content: userMessage });
    
    yield* this.groqService!.streamChat(conversationHistory);
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - FALLBACK FINAL
  // ============================================================================

  private getFallbackResponse(userMessage: string): string {
    this.currentProvider = 'fallback';
    
    const intencion = detectarIntencion(userMessage);
    console.log(`🎯 Intención detectada para fallback: ${intencion}`);
    
    switch (intencion) {
      case 'saludo':
        return RESPUESTAS_SEGURAS.saludo(this.lastUserName || undefined);
      case 'stack':
        return RESPUESTAS_SEGURAS.stack();
      case 'proyectos':
        return RESPUESTAS_SEGURAS.proyectos();
      case 'contacto':
        return RESPUESTAS_SEGURAS.contacto();
      case 'voi':
        return RESPUESTAS_SEGURAS.voi();
      case 'experiencia':
        return RESPUESTAS_SEGURAS.experiencia();
      default:
        return RESPUESTAS_SEGURAS.default();
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - LOGGING
  // ============================================================================

  private logProviderError(provider: AIProvider, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorType = error instanceof OllamaServiceError ? error.code : 'UNKNOWN';
    
    console.error(`❌ ${provider.toUpperCase()} falló [${errorType}]: ${errorMessage}`);
    
    // Marcar Ollama como no disponible si hubo error de conexión
    if (provider === 'ollama' && error instanceof OllamaServiceError) {
      if (error.code === 'CONNECTION') {
        this.isOllamaAvailable = false;
      }
    }
  }
}
