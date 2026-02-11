/**
 * Ollama Service - Sistema Robusto
 * Propaga errores al orquestador para fallback a otros proveedores
 */

import { 
  generarPromptOllama, 
  extraerNombre,
  validarRespuesta,
  OLLAMA_CONFIG
} from '../config/prompt-system';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaStreamResponse {
  message?: { content: string };
  done: boolean;
}

export class OllamaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONNECTION' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'ABORTED',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'OllamaServiceError';
  }
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

export class OllamaService {
  private readonly baseUrl: string;
  private readonly model: string;
  
  private abortController: AbortController | null = null;
  private userName: string | null = null;
  private messageCount: number = 0;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'chill') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Stream chat con Ollama
   * @throws {OllamaServiceError} Si hay error de conexión o respuesta
   */
  async *streamChat(
    history: Array<{ role: string; text: string }>,
    userMessage: string,
    _systemInstruction?: string,
    userName?: string
  ): AsyncGenerator<string> {
    // Actualizar contexto
    this.updateContext(userMessage, userName);
    
    // Preparar mensajes
    const messages = this.buildMessages(history, userMessage);
    
    // Ejecutar stream
    yield* this.executeStream(messages);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async warmup(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: 'test',
          stream: false,
          options: { num_predict: 1 }
        }),
        signal: AbortSignal.timeout(5000),
      });
      console.log('🦙 Ollama warm-up completado');
    } catch (error) {
      console.warn('⚠️ Ollama warmup failed:', error);
    }
  }

  getUserName(): string | null {
    return this.userName;
  }

  setUserName(name: string): void {
    this.userName = name;
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private updateContext(userMessage: string, userName?: string): void {
    // Actualizar nombre si se proporciona externamente
    if (userName) {
      this.userName = userName;
    }
    
    // Intentar extraer nombre del mensaje
    const nombreExtraido = extraerNombre(userMessage);
    if (nombreExtraido) {
      this.userName = nombreExtraido;
      console.log(`📝 Nombre detectado: ${this.userName}`);
    }
    
    this.messageCount++;
  }

  private buildMessages(
    history: Array<{ role: string; text: string }>,
    userMessage: string
  ): OllamaMessage[] {
    const systemPrompt = generarPromptOllama({
      userName: this.userName || undefined,
      messageCount: this.messageCount
    });

    return [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((msg) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text,
      })),
      { role: 'user', content: userMessage }
    ];
  }

  private async *executeStream(messages: OllamaMessage[]): AsyncGenerator<string> {
    this.abortController = new AbortController();

    let response: Response;
    
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
          options: OLLAMA_CONFIG.generationParams,
        }),
        signal: this.abortController.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaServiceError('Generación cancelada', 'ABORTED', error);
      }
      throw new OllamaServiceError(
        'No se pudo conectar con Ollama',
        'CONNECTION',
        error
      );
    }

    if (!response.ok) {
      throw new OllamaServiceError(
        `Ollama respondió con error: ${response.status} ${response.statusText}`,
        'INVALID_RESPONSE'
      );
    }

    if (!response.body) {
      throw new OllamaServiceError(
        'Respuesta sin body stream',
        'INVALID_RESPONSE'
      );
    }

    yield* this.processStream(response.body);
  }

  private async *processStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          const content = this.parseStreamLine(line);
          if (content) {
            fullResponse += content;
            yield content;
          }
        }
      }

      // Post-procesamiento de la respuesta completa
      this.validateAndLogResponse(fullResponse);
      
    } finally {
      reader.releaseLock();
    }
  }

  private parseStreamLine(line: string): string | null {
    try {
      const json: OllamaStreamResponse = JSON.parse(line);
      return json.message?.content || null;
    } catch {
      return null; // Skip malformed JSON
    }
  }

  private validateAndLogResponse(response: string): void {
    const validacion = validarRespuesta(response);
    
    if (!validacion.valida) {
      console.warn(`⚠️ Respuesta requiere corrección: ${validacion.razon}`);
      // Nota: La corrección se aplica en el orquestador si es necesario
    }
  }
}
