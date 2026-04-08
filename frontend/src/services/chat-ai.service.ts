/**
 * Servicio de IA para Chat CIOR
 * Simplificado y adaptado desde Chill Bot
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// @ts-ignore - Vite env variables
const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001/api';

/**
 * Servicio principal de chat con IA
 */
export class ChatAIService {
  private history: ChatMessage[] = [];

  /**
   * Enviar mensaje y obtener respuesta streaming
   * Cascada: Ollama → Grok → Gemini → Fallback
   */
  async *sendMessage(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.history.push({ role: 'user', content: userMessage });

    // Nivel 0: Intentar con Ollama primero (local, vía backend)
    try {
      console.log('🦙 Intentando con Ollama...');
      yield* this.streamWithOllama(userMessage);
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Ollama falló:', errorMsg);
      console.log('🔄 Intentando con Grok...');
    }

    // Nivel 1: Intentar con Grok (vía backend con Groq API)
    try {
      console.log('🤖 Intentando con Grok (Groq API)...');
      yield* this.streamWithGrok(userMessage);
      return; // Si funciona, salir
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Grok falló:', errorMsg);
      console.log('🔄 Intentando con Gemini...');
    }

    // Nivel 2: Intentar con Gemini como fallback
    if (GEMINI_API_KEY) {
      try {
        yield* this.streamWithGemini(userMessage);
        return; // Si funciona, salir
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('404')) {
          console.error('❌ Gemini: API key inválida o modelo no disponible');
        } else if (errorMsg.includes('429')) {
          console.error('⚠️ Gemini: Cuota de requests excedida');
        } else {
          console.warn('⚠️ Gemini falló:', errorMsg);
        }
        console.log('🔄 Usando respuestas predefinidas...');
      }
    }

    // Nivel 3: Fallback local
    console.log('📋 Usando respuestas automáticas (IA no disponible)');
    yield* this.fallbackResponse(userMessage);
  }

  /**
   * Stream con Gemini API
   */
  private async *streamWithGemini(message: string): AsyncGenerator<string> {
    // System prompt compacto incluido en el mensaje
    const fullPrompt = `Contexto: Eres Nexus, asistente de CIOR Imágenes (Balcarce 1001, Rosario). Tel: (0341) 425-8501. WhatsApp: 3413017960. Horario: L-V 8-19hs. IMPORTANTE: Trabajamos por ORDEN DE LLEGADA, NO hay sistema de turnos. Los pacientes pueden venir directamente. Para AGILIZAR su atención, recomendá cargar la orden médica desde este chat antes de venir, así evitan esperas en mesa de entrada. Servicios: radiología odontológica, tomografía 3D CBCT, ortodoncia digital. Equipo: Od. Andrés Alés, Od. Carolina Alés, Od. Álvaro Alonso, Od. Julieta Pozzi, Dra. Virginia Fattal. NO hacés diagnósticos. Tono: amable, profesional.

Pregunta: ${message}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 404)
        throw new Error('404: Gemini API key inválida o modelo no disponible');
      if (status === 429) throw new Error('429: Cuota de Gemini excedida');
      if (status === 403) throw new Error('403: Acceso denegado a Gemini API');
      throw new Error(`Gemini API error: ${status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullResponse += text;
              yield text;
            }
          } catch (e) {
            // Ignorar líneas mal formadas
          }
        }
      }
    }

    this.history.push({ role: 'assistant', content: fullResponse });
  }

  /**
   * System prompt compartido para los modelos de chat (Ollama / Grok)
   */
  private getCiorSystemPrompt(): string {
    return `Eres Nexus, el asistente virtual oficial de CIOR Imágenes, centro de diagnóstico por imágenes odontológicas y maxilofaciales en Rosario, Argentina.

**INFORMACIÓN DE CONTACTO:**
📍 Dirección: Balcarce 1001, Rosario, Santa Fe, Argentina
📞 Teléfonos: (0341) 425-8501 / 421-1408
💬 WhatsApp: 3413017960
⏰ Horario: Lunes a Viernes de 8:00 a 19:00hs

**SERVICIOS:** Radiología odontológica, ortodoncia, tomografía 3D CBCT, odontología digital.
**EQUIPO:** Od. Andrés Alés, Od. Carolina Alés, Od. Álvaro Alonso, Od. Julieta Pozzi, Dra. Virginia Fattal Jaef.

**SISTEMA DE ATENCIÓN MUY IMPORTANTE:**
- CIOR trabaja por ORDEN DE LLEGADA, NO hay sistema de turnos
- Los pacientes pueden acercarse directamente en el horario de atención
- Para AGILIZAR la atención y EVITAR ESPERAS en mesa de entrada, siempre recomendá que carguen su orden médica desde este chat ANTES de venir
- La orden queda registrada en el sistema, lo que acelera el proceso

NO agendás turnos (no existen), NO hacés diagnósticos. Sé amable, profesional y conciso.`;
  }

  /**
   * Stream con Ollama (vía backend, modelo local)
   */
  private async *streamWithOllama(message: string): AsyncGenerator<string> {
    const systemPrompt = this.getCiorSystemPrompt();

    const response = await fetch(`${BACKEND_URL}/ai/ollama`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: this.history.slice(0, -1),
        newMessage: message,
        systemPrompt,
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);

    const result = await response.json();

    let fullResponse = '';
    if (result.data) {
      fullResponse = result.data.response || '';
    } else if (result.response) {
      fullResponse = result.response;
    }

    if (!fullResponse || typeof fullResponse !== 'string' || fullResponse.trim() === '') {
      throw new Error('Respuesta vacía de Ollama');
    }

    console.log('✅ Ollama respondió:', fullResponse.substring(0, 100));

    // Simular streaming para consistencia visual
    for (let i = 0; i < fullResponse.length; i += 5) {
      const chunk = fullResponse.slice(i, i + 5);
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    this.history.push({ role: 'assistant', content: fullResponse });
  }

  /**
   * Stream con Grok API (vía backend)
   */
  private async *streamWithGrok(message: string): AsyncGenerator<string> {
    const systemPrompt = `Eres Nexus, el asistente virtual oficial de CIOR Imágenes, centro de diagnóstico por imágenes odontológicas y maxilofaciales en Rosario, Argentina.

**INFORMACIÓN DE CONTACTO:**
📍 Dirección: Balcarce 1001, Rosario, Santa Fe, Argentina
📞 Teléfonos: (0341) 425-8501 / 421-1408
💬 WhatsApp: 3413017960
⏰ Horario: Lunes a Viernes de 8:00 a 19:00hs

**SERVICIOS:** Radiología odontológica, ortodoncia, tomografía 3D CBCT, odontología digital.
**EQUIPO:** Od. Andrés Alés, Od. Carolina Alés, Od. Álvaro Alonso, Od. Julieta Pozzi, Dra. Virginia Fattal Jaef.

**SISTEMA DE ATENCIÓN MUY IMPORTANTE:**
- CIOR trabaja por ORDEN DE LLEGADA, NO hay sistema de turnos
- Los pacientes pueden acercarse directamente en el horario de atención
- Para AGILIZAR la atención y EVITAR ESPERAS en mesa de entrada, siempre recomendá que carguen su orden médica desde este chat ANTES de venir
- La orden queda registrada en el sistema, lo que acelera el proceso

NO agendás turnos (no existen), NO hacés diagnósticos. Sé amable, profesional y conciso.`;

    const response = await fetch(`${BACKEND_URL}/ai/grok`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: this.history.slice(0, -1), // Sin el último mensaje (ya está en newMessage)
        newMessage: message,
        systemPrompt: systemPrompt,
      }),
    });

    if (!response.ok) throw new Error(`Grok API error: ${response.status}`);

    const result = await response.json();
    console.log('✅ Respuesta completa:', result);

    // Extraer la respuesta del backend (estructura: { success, data: { response } })
    let fullResponse = '';

    if (result.data) {
      fullResponse = result.data.response || '';
      console.log('📦 Extraído de result.data.response:', fullResponse);
    } else if (result.response) {
      fullResponse = result.response;
      console.log('📦 Extraído de result.response:', fullResponse);
    }

    if (!fullResponse || typeof fullResponse !== 'string' || fullResponse.trim() === '') {
      console.error('❌ No se pudo extraer texto válido:', { result, fullResponse });
      throw new Error('Respuesta vacía de Grok');
    }

    console.log('✅ ÉXITO - Texto a mostrar:', fullResponse.substring(0, 100));

    // Simular streaming para consistencia
    for (let i = 0; i < fullResponse.length; i += 5) {
      const chunk = fullResponse.slice(i, i + 5);
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    this.history.push({ role: 'assistant', content: fullResponse });
  }

  /**
   * Respuesta de fallback cuando no hay API
   */
  private async *fallbackResponse(message: string): AsyncGenerator<string> {
    const responses = {
      horario:
        '⏰ **Nuestros horarios de atención son:**\n\n📅 **Lunes a Viernes**: 8:00 a 19:00hs\n\n🏥 Trabajamos por **orden de llegada**, no es necesario sacar turno previo. Para agilizar tu atención, te recomendamos subir tu orden médica desde este chat antes de venir. ¿Quéres cargar tu orden ahora?',
      servicios:
        '🦷 **Servicios de CIOR:**\n\n✓ Tomografía CBCT 3D\n✓ Radiografías panorámicas\n✓ Telerradiografías\n✓ Escaneo intraoral digital\n✓ Modelos 3D\n✓ Planificación de implantes\n\n🏥 **Atención por orden de llegada** - No necesitás turno previo\n⚡ **Agilizá tu atención** cargando tu orden médica desde este chat\n\n¿Te interesa algún estudio en particular?',
      orden:
        '� **Para subir tu orden médica:**\n\n1. Haz clic en "SUBIR ORDEN MÉDICA" en este chat\n2. Selecciona la foto o PDF de tu orden\n3. Completa los datos y confirma el envío\n\n⚡ **¿Por qué cargar tu orden aquí?**\n✓ Evitás esperas en mesa de entrada\n✓ Tu orden queda registrada en nuestro sistema\n✓ Agilizamos tu atención cuando llegues al centro\n\n🏥 Trabajamos por orden de llegada - No necesitás turno previo\n\n¿Tienes tu orden lista?',
      turno:
        '🏥 **Atención por orden de llegada:**\n\nEn CIOR trabajamos **sin sistema de turnos**. Podés acercarte directamente en nuestro horario de atención:\n\n⏰ **Lunes a Viernes**: 8:00 a 19:00hs\n📍 **Dirección**: Balcarce 1001, Rosario\n\n⚡ **Tip**: Para agilizar tu atención y evitar esperas en mesa de entrada, te recomendamos **cargar tu orden médica desde este chat** antes de venir.\n\n📞 **Consultas**: \n• Teléfono: (0341) 425-8501 / 421-1408\n• WhatsApp: 3413017960\n\n¿Querés subir tu orden ahora?',
      ubicacion:
        '📍 **Ubicación de CIOR:**\n\n🏥 Dirección: Balcarce 1001, Rosario, Santa Fe\n📞 Teléfono: (0341) 425-8501 / 421-1408\n📱 WhatsApp: 3413017960\n⏰ Horario: Lunes a Viernes de 8:00 a 19:00\n\n🚗 Contamos con estacionamiento disponible\n🏥 Atención por orden de llegada (sin turnos)\n\n⚡ Agilizá tu atención cargando tu orden médica desde este chat. ¿Necesitas indicaciones para llegar?',
      cbct: '🔬 **Tomografía CBCT (Cone Beam):**\n\nEs un estudio 3D de alta resolución que permite:\n✓ Visualización completa de estructuras dentales\n✓ Planificación precisa de implantes\n✓ Evaluación de hueso y nervios\n✓ Diagnóstico de patologías\n\n⏱️ Duración: 15-20 min\n📊 Resultados: 24-48hs\n☢️ Mínima radiación\n\n¿Tienes orden médica para este estudio?',
      fallback:
        '🤖 No encontré información específica para tu consulta, pero puedo ayudarte con servicios, turnos, estudios, tecnología, ubicación y más. Por favor, intenta ser más específico o pregunta por un servicio concreto.',
    };

    const lowerMessage = message.toLowerCase();
    let response: string | null = null;

    if (lowerMessage.includes('horario') || lowerMessage.includes('hora'))
      response = responses.horario;
    else if (
      lowerMessage.includes('servicio') ||
      lowerMessage.includes('estudio') ||
      lowerMessage.includes('que hacen') ||
      lowerMessage.includes('qué hacen') ||
      lowerMessage.includes('ofrecen')
    )
      response = responses.servicios;
    else if (
      lowerMessage.includes('orden') ||
      lowerMessage.includes('subir') ||
      lowerMessage.includes('cargar')
    )
      response = responses.orden;
    else if (
      lowerMessage.includes('turno') ||
      lowerMessage.includes('cita') ||
      lowerMessage.includes('agendar')
    )
      response = responses.turno;
    else if (
      lowerMessage.includes('ubicacion') ||
      lowerMessage.includes('ubicación') ||
      lowerMessage.includes('direccion') ||
      lowerMessage.includes('dirección') ||
      lowerMessage.includes('donde')
    )
      response = responses.ubicacion;
    else if (
      lowerMessage.includes('cbct') ||
      lowerMessage.includes('tomografia') ||
      lowerMessage.includes('tomografía') ||
      lowerMessage.includes('3d')
    )
      response = responses.cbct;

    if (!response) {
      response = responses.fallback;
    }

    // Simular streaming
    for (const char of response) {
      yield char;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    this.history.push({ role: 'assistant', content: response });
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Obtener historial
   */
  getHistory() {
    return this.history;
  }
}
