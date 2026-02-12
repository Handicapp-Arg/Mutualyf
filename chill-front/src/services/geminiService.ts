/**
 * Gemini Service - Servicio simplificado para Google Gemini
 * Usa el sistema de prompts centralizado
 */

import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GeminiModel } from "../types";
import { generarPromptGemini, ASSISTANT_CONFIG } from "../config/prompt-system";

const formatHistory = (messages: ChatMessage[]) => {
  return messages
    .filter(msg => !msg.isError)
    .map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));
};

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: GeminiModel;
  private hasAskedName: boolean = false;
  private userName: string | null = null;

  constructor(apiKey: string, modelName: GeminiModel = 'gemini-2.5-flash', _systemInstruction?: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async *streamChat(
    history: ChatMessage[], 
    newMessage: string, 
    _userRequest?: any
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Detectar nombre en el mensaje actual
      if (!this.userName) {
        const extractedName = this.extractNameFromMessage(newMessage);
        if (extractedName) {
          this.userName = extractedName;
          console.log("Nombre detectado: " + extractedName);
        }
      }

      // Generar prompt usando el sistema centralizado
      const systemPrompt = generarPromptGemini({
        userName: this.userName || undefined,
        hasAskedName: this.hasAskedName,
        messageCount: history.filter(m => m.role === 'user').length
      });

      // Marcar que pedimos el nombre si es el primer mensaje
      if (!this.userName && !this.hasAskedName && history.length <= 2) {
        this.hasAskedName = true;
      }

      // Construir mensaje con contexto
      const enhancedMessage = systemPrompt + "\n\n---\nMENSAJE DEL USUARIO: " + newMessage + "\n\nRESPONDE DE FORMA DIRECTA Y BREVE (maximo 3-4 lineas para preguntas simples).";

      const chatConfig: any = {
        model: this.modelName,
        history: formatHistory(history),
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      };

      const chat: Chat = this.ai.chats.create(chatConfig);
      const resultStream = await chat.sendMessageStream({ message: enhancedMessage });

      let fullResponse = '';

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          if (this.isValidContent(c.text)) {
            fullResponse += c.text;
            yield c.text;
          }
        }
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Failed to generate response");
    }
  }

  private extractNameFromMessage(message: string): string | null {
    const trimmedMessage = message.trim();
    
    const patterns = [
      /(?:soy|me llamo|mi nombre es)\s+([A-Za-z]+)/i,
      /(?:i am|my name is|i'm)\s+([A-Za-z]+)/i,
      /(?:llamame|decime|puedes llamarme)\s+([A-Za-z]+)/i,
      /^([A-Z][a-z]{1,15})$/,
    ];
    
    const commonWords = ['hola', 'hello', 'gracias', 'ok', 'bien', 'si', 'yes', 'no', 'que', 'como', 'proyectos', 'tecnologias', 'stack', 'contacto', 'cv'];
    
    for (const pattern of patterns) {
      const match = trimmedMessage.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (!commonWords.includes(name.toLowerCase()) && name.length >= 2 && name.length <= 20) {
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
      }
    }
    
    return null;
  }

  private isValidContent(text: string): boolean {
    const lowerText = text.toLowerCase();
    return !ASSISTANT_CONFIG.prohibido.some(term => lowerText.includes(term.toLowerCase()));
  }

  getUserName(): string | null {
    return this.userName;
  }

  setUserName(name: string): void {
    this.userName = name;
  }
}
