/**
 * Groq AI Service
 * Service for interacting with Groq API (fallback when Gemini fails)
 */

import { CLOUD_CONFIG } from '../config/prompt-system';

export class GroqService {
  private apiKey: string;
  private model: string;
  private systemInstruction: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile', systemInstruction: string = '') {
    this.apiKey = apiKey;
    this.model = model;
    this.systemInstruction = systemInstruction;
  }

  async *streamChat(
    conversationHistory: Array<{ role: string; content: string }>,
    onError?: (error: Error) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      const messages = [
        {
          role: 'system',
          content: this.systemInstruction,
        },
        ...conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: CLOUD_CONFIG.generationParams.temperature,
          max_tokens: CLOUD_CONFIG.generationParams.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Groq streaming error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
      throw error;
    }
  }
}
