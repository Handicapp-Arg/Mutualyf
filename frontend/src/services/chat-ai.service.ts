import type { AIChatMessage } from '@/types';
import { BACKEND_URL } from '@/lib/constants';

/**
 * ChatAIService — delega toda la lógica de cascada al backend.
 *
 * El backend maneja vía SSE:
 *   QuickReply → OffTopic → Ollama stream → Ollama retry → Groq → Fallback
 *
 * Esto elimina 3-4 round-trips que antes hacía el frontend y permite que las
 * quick replies respondan en 0ms (directo desde DB, sin pasar por IA).
 */
export class ChatAIService {
  private history: AIChatMessage[] = [];

  async *sendMessage(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.history.push({ role: 'user', content: userMessage });

    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: this.history.slice(0, -1),
        newMessage: userMessage,
      }),
    });

    if (!response.ok) {
      this.history.pop();
      throw new Error(`Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const data = line.replace(/^data: /, '').trim();
        if (!data || data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.warning === 'ai-cascade-failed') {
            console.warn(
              '[AI cascade] Todos los proveedores fallaron, usando fallback:',
              parsed.failures,
            );
            for (const f of parsed.failures || []) {
              console.warn(`  · ${f.stage}: ${f.message}`);
            }
            continue;
          }
          if (parsed.content) {
            fullResponse += parsed.content;
            yield parsed.content;
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    if (fullResponse.trim()) {
      this.history.push({ role: 'assistant', content: fullResponse });
    } else {
      this.history.pop();
    }
  }

  clearHistory() {
    this.history = [];
  }

  getHistory() {
    return this.history;
  }
}
