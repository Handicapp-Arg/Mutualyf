import type { AIChatMessage } from '@/types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export class ChatAIService {
  private history: AIChatMessage[] = [];

  /**
   * Enviar mensaje y obtener respuesta streaming
   * Cascada: Ollama (SSE) → Grok → Gemini → Fallback
   */
  async *sendMessage(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.history.push({ role: 'user', content: userMessage });

    // Nivel 0: Ollama (streaming real via SSE)
    try {
      yield* this.streamWithOllama(userMessage);
      return;
    } catch {
      // fallback silencioso
    }

    // Nivel 1: Grok (via backend)
    try {
      yield* this.requestWithFallback('/ai/grok', userMessage);
      return;
    } catch {
      // fallback silencioso
    }

    // Nivel 2: Gemini (via backend)
    try {
      yield* this.requestWithFallback('/ai/gemini', userMessage);
      return;
    } catch {
      // fallback silencioso
    }

    // Nivel 3: Fallback local
    yield* this.fallbackResponse(userMessage);
  }

  /**
   * Streaming real via SSE desde Ollama
   */
  private async *streamWithOllama(message: string): AsyncGenerator<string> {
    const response = await fetch(`${BACKEND_URL}/ai/ollama`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: this.history.slice(0, -1),
        newMessage: message,
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

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
          if (parsed.content) {
            fullResponse += parsed.content;
            yield parsed.content;
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }

    if (!fullResponse.trim()) throw new Error('Respuesta vacía de Ollama');
    this.history.push({ role: 'assistant', content: fullResponse });
  }

  /**
   * Request no-streaming para Grok/Gemini (via backend)
   */
  private async *requestWithFallback(endpoint: string, message: string): AsyncGenerator<string> {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: this.history.slice(0, -1),
        newMessage: message,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    const fullResponse = result.data?.response || result.response || '';

    if (!fullResponse.trim()) throw new Error('Respuesta vacía');

    // Yield progresivo para UX consistente
    const words = fullResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield (i > 0 ? ' ' : '') + words[i];
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 10));
    }

    this.history.push({ role: 'assistant', content: fullResponse });
  }

  /**
   * Respuesta de fallback cuando no hay API
   */
  private async *fallbackResponse(message: string): AsyncGenerator<string> {
    const RESP_HORARIO = '**Nuestros horarios de atención son:**\n\nLunes a Viernes: 8:00 a 19:00hs\n\nTrabajamos por orden de llegada, no es necesario sacar turno previo. Para agilizar tu atención, te recomendamos subir tu orden médica desde este chat antes de venir.';
    const RESP_SERVICIOS = '**Servicios de CIOR:**\n\n- Tomografía CBCT 3D\n- Radiografías panorámicas\n- Telerradiografías\n- Escaneo intraoral digital\n- Modelos 3D\n- Planificación de implantes\n\nAtención por orden de llegada. Agilizá tu atención cargando tu orden médica desde este chat.';
    const RESP_TURNO = '**Atención por orden de llegada:**\n\nEn CIOR trabajamos sin sistema de turnos. Podés acercarte directamente en nuestro horario de atención:\n\nLunes a Viernes: 8:00 a 19:00hs\nDirección: Balcarce 1001, Rosario\n\nPara agilizar tu atención, te recomendamos cargar tu orden médica desde este chat antes de venir.\n\nConsultas: (0341) 425-8501 / 421-1408 | WhatsApp: 3413017960';
    const RESP_UBICACION = '**Ubicación de CIOR:**\n\nDirección: Balcarce 1001, Rosario, Santa Fe\nTeléfono: (0341) 425-8501 / 421-1408\nWhatsApp: 3413017960\nHorario: Lunes a Viernes de 8:00 a 19:00\n\nAtención por orden de llegada (sin turnos).';

    const lower = message.toLowerCase();
    let response: string;

    if (lower.includes('horario') || lower.includes('hora')) response = RESP_HORARIO;
    else if (lower.includes('servicio') || lower.includes('estudio') || lower.includes('ofrecen')) response = RESP_SERVICIOS;
    else if (lower.includes('turno') || lower.includes('cita') || lower.includes('agendar')) response = RESP_TURNO;
    else if (lower.includes('ubicacion') || lower.includes('ubicación') || lower.includes('direccion') || lower.includes('dirección') || lower.includes('donde')) response = RESP_UBICACION;
    else response = 'No encontré información específica para tu consulta. Puedo ayudarte con servicios, horarios, ubicación y más. Intentá ser más específico.';

    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield (i > 0 ? ' ' : '') + words[i];
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 15));
    }

    this.history.push({ role: 'assistant', content: response });
  }

  clearHistory() {
    this.history = [];
  }

  getHistory() {
    return this.history;
  }
}
