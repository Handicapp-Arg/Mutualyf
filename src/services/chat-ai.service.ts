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

/**
 * Servicio principal de chat con IA
 */
export class ChatAIService {
  private history: ChatMessage[] = [];

  /**
   * Enviar mensaje y obtener respuesta streaming
   */
  async *sendMessage(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.history.push({ role: 'user', content: userMessage });

    try {
      // Intentar con Gemini primero
      if (GEMINI_API_KEY) {
        yield* this.streamWithGemini(userMessage);
      } else {
        // Fallback: respuesta básica
        yield* this.fallbackResponse(userMessage);
      }
    } catch (error) {
      console.error('Error en chat:', error);
      yield* this.fallbackResponse(userMessage);
    }
  }

  /**
   * Stream con Gemini API
   */
  private async *streamWithGemini(message: string): AsyncGenerator<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Eres Nexus, el asistente virtual oficial del Centro CIOR (Centro de Imágenes y Odontología Radiológica).

**CONTEXTO DEL USUARIO:**
- Si aún no conoces su nombre, salúdalo y pregúntale cómo se llama de forma natural
- Si ya te dio su nombre, úsalo en la conversación para personalizar
- Cuando te diga su nombre, responde con algo como: "¡Encantado [Nombre]! ¿En qué puedo ayudarte hoy?"

**INFORMACIÓN CLAVE DE CIOR:**

📍 **Ubicación**: [Insertar dirección real]
📞 **Teléfono**: [Insertar teléfono]
📧 **Email**: contacto@cior.com.ar
⏰ **Horario**: Lunes a Viernes 8:00-20:00hs | Sábados 9:00-13:00hs

**SERVICIOS PRINCIPALES:**
- Tomografía Computada Cone Beam (CBCT) - Alta resolución 3D
- Radiografías panorámicas digitales
- Telerradiografías cefalométricas
- Radiografías periapicales
- Escaneo intraoral digital
- Modelos digitales 3D
- Planificación de implantes
- Análisis ortodóncico completo

**TECNOLOGÍA:**
- Equipos de última generación con mínima radiación
- Resultados en formato digital inmediato
- Plataforma segura para médicos
- Software de diagnóstico avanzado

**PROCESO DE ATENCIÓN:**
1. El paciente trae orden médica (física o puede subirla aquí)
2. Se agenda turno (mismo día disponible)
3. Estudio realizado en 15-20 minutos
4. Resultados digitales en 24-48hs
5. Entrega a odontólogo tratante vía plataforma segura

**TU FUNCIÓN:**
- Responder consultas sobre servicios y tecnología
- Explicar procedimientos y tiempos
- Guiar sobre cómo subir órdenes médicas
- Proporcionar información de contacto y ubicación
- Resolver dudas sobre estudios específicos

⚠️ **IMPORTANTE**: NO puedes agendar turnos directamente. Para turnos, el paciente debe llamar al teléfono o usar WhatsApp.

**TONO**: Amable, profesional, cercano. Usa el nombre del usuario cuando lo conozcas. Emojis ocasionales para claridad.

Pregunta del usuario: ${message}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini API error');

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
   * Respuesta de fallback cuando no hay API
   */
  private async *fallbackResponse(message: string): AsyncGenerator<string> {
    const responses = {
      horario:
        '⏰ Nuestros horarios de atención son:\n\n📅 **Lunes a Viernes**: 8:00 a 20:00hs\n📅 **Sábados**: 9:00 a 13:00hs\n📅 **Domingos**: Cerrado\n\n¿Necesitas agendar un turno?',
      servicios:
        '🦷 **Servicios de CIOR:**\n\n✓ Tomografía CBCT 3D\n✓ Radiografías panorámicas\n✓ Telerradiografías\n✓ Escaneo intraoral digital\n✓ Modelos 3D\n✓ Planificación de implantes\n\nTodos con tecnología de última generación y mínima radiación. ¿Te interesa algún estudio en particular?',
      orden:
        '📄 **Para subir tu orden médica:**\n\n1. Haz clic en "SUBIR ORDEN MÉDICA" en este chat\n2. Selecciona la foto o PDF de tu orden\n3. Confirma el envío\n\nEs rápido, seguro y te contactaremos para agendar tu turno. ¿Tienes tu orden lista?',
      turno:
        '📞 **Para agendar turnos:**\n\n• Llamanos: [Teléfono]\n• WhatsApp: [Número]\n• Email: contacto@cior.com.ar\n\n⚡ Tenemos disponibilidad para el mismo día en la mayoría de los casos. ¿Prefieres que te contactemos?',
      ubicacion:
        '📍 **Ubicación de CIOR:**\n\n🏥 Dirección: [Insertar dirección completa]\n📞 Teléfono: [Teléfono]\n📧 Email: contacto@cior.com.ar\n\n🚗 Contamos con estacionamiento disponible. ¿Necesitas indicaciones para llegar?',
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
