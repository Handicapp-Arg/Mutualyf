import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  MessageCircle,
  Upload,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { ChatAIService } from '@/services/chat-ai.service';
import { BackendAPIService } from '@/services/backend-api.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatService = useRef(new ChatAIService());
  const backendService = useRef(new BackendAPIService());

  useEffect(() => {
    // Intentar cargar historial del backend
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      const history = await backendService.current.getConversationHistory();
      if (history.length > 0) {
        setMessages(
          history.map((msg, idx) => ({
            id: idx.toString(),
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          }))
        );
      } else {
        // Saludo profesional y guía de temas si no hay historial
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content:
              '👋 ¡Hola! Soy NexusBot de **CIOR** - Centro de Imágenes y Odontología Radiológica.\n\n¿En qué puedo ayudarte hoy?\n\n📋 **Puedo informarte sobre:**\n• Servicios y estudios disponibles\n• Horarios y ubicación\n• Cómo subir tu orden médica\n• Agendar turnos\n• Tecnología y procedimientos\n\nPor favor, dime tu consulta específica.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      // Si falla la carga, mostrar saludo profesional
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content:
            '👋 ¡Hola! Soy NexusBot de **CIOR** - Centro de Imágenes y Odontología Radiológica.\n\n¿En qué puedo ayudarte hoy?\n\n📋 **Puedo informarte sobre:**\n• Servicios y estudios disponibles\n• Horarios y ubicación\n• Cómo subir tu orden médica\n• Agendar turnos\n• Tecnología y procedimientos\n\nPor favor, dime tu consulta específica.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    if (feedbackGiven.has(messageId)) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    // Encontrar el mensaje del usuario anterior
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    const userMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === 'user');

    try {
      await backendService.current.sendFeedback(
        messageId,
        feedback,
        `Usuario: ${userMessage?.content || ''}\nBot: ${message.content}`
      );

      setFeedbackGiven((prev) => new Set(prev).add(messageId));
    } catch (error) {
      console.error('Error guardando feedback:', error);
    }
  };

  // Detectar nombre en el mensaje del usuario
  const detectName = (text: string) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);

    // Patrones para detectar nombre
    const namePatterns = [
      /(?:me llamo|soy|mi nombre es)\s+([a-záéíóúñ]+)/i,
      /^([a-záéíóúñ]{3,20})$/i, // Una sola palabra (nombre)
      /^([a-záéíóúñ]{3,20})\s+([a-záéíóúñ]{3,20})$/i, // Nombre y apellido
    ];

    // Si es respuesta corta (1-2 palabras), probablemente sea el nombre
    if (words.length === 1 && /^[a-záéíóúñ]{3,20}$/i.test(trimmed)) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }

    if (words.length === 2 && words.every((w) => /^[a-záéíóúñ]{3,20}$/i.test(w))) {
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Patrones con frases explícitas
    for (const pattern of namePatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const detectedName =
          match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        if (detectedName.length >= 3 && detectedName.length <= 20) {
          return detectedName;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    // Si el usuario solo dice "hola" o variantes, mostrar solo el saludo profesional y guía
    const normalized = inputText.trim().toLowerCase();
    if (["hola", "buenas", "buenos días", "buenas tardes", "buenas noches"].includes(normalized)) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '👋 ¡Hola! Soy NexusBot de **CIOR** - Centro de Imágenes y Odontología Radiológica.\n\n¿En qué puedo ayudarte hoy?\n\n📋 **Puedo informarte sobre:**\n• Servicios y estudios disponibles\n• Horarios y ubicación\n• Cómo subir tu orden médica\n• Agendar turnos\n• Tecnología y procedimientos\n\nPor favor, dime tu consulta específica.',
        timestamp: new Date(),
      }]);
      setInputText('');
      return;
    }

    // Detectar nombre si aún no lo tenemos (solo si no es saludo)
    if (!userName) {
      const detected = detectName(inputText);
      if (detected) {
        setUserName(detected);
        localStorage.setItem('cior_user_name', detected);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      let assistantContent = '';
      // Obtener respuesta de la IA (streaming o fallback)
      for await (const chunk of chatService.current.sendMessage(inputText)) {
        assistantContent += chunk;
        setMessages((prev) => {
          // Actualiza el último mensaje del asistente, o lo agrega si no existe
          const lastIdx = prev.length - 1;
          if (prev[lastIdx]?.role === 'assistant') {
            // Actualiza el último mensaje del asistente
            return [
              ...prev.slice(0, lastIdx),
              { ...prev[lastIdx], content: assistantContent },
            ];
          } else {
            // Agrega un nuevo mensaje del asistente
            return [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date(),
              },
            ];
          }
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Hubo un error procesando tu consulta. Por favor, intenta nuevamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const result = await backendService.current.uploadMedicalOrder(file);

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ ¡Orden médica recibida! Hemos recibido tu archivo "${file.name}". Nos contactaremos contigo pronto para agendar tu turno. ¿Necesitas algo más?`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '❌ Hubo un error al subir tu orden médica. Por favor, intenta nuevamente o contáctanos directamente.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ No pudimos procesar tu archivo. Por favor, intenta nuevamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-100 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-corporate text-white sm:h-10 sm:w-10">
            <MessageCircle size={16} className="sm:h-5 sm:w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 sm:text-base">Chat CIOR</h4>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 sm:h-2 sm:w-2" />
              <span className="text-[10px] text-slate-400 sm:text-xs">En línea</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
        style={{ maxHeight: '350px', minHeight: '200px' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[85%] sm:max-w-[80%]">
              <div
                className={`rounded-2xl px-3 py-2 sm:px-4 ${
                  message.role === 'user'
                    ? 'bg-corporate text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                  {message.content}
                </p>
              </div>

              {/* Feedback Buttons - Solo para mensajes del asistente */}
              {message.role === 'assistant' && message.content && (
                <div className="mt-2 flex items-center gap-2 px-2">
                  <button
                    onClick={() => handleFeedback(message.id, 'positive')}
                    disabled={feedbackGiven.has(message.id)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all ${
                      feedbackGiven.has(message.id)
                        ? 'cursor-not-allowed opacity-50'
                        : 'text-slate-500 hover:bg-green-50 hover:text-green-600'
                    }`}
                    title="Útil"
                  >
                    <ThumbsUp size={12} />
                    <span>Útil</span>
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id, 'negative')}
                    disabled={feedbackGiven.has(message.id)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all ${
                      feedbackGiven.has(message.id)
                        ? 'cursor-not-allowed opacity-50'
                        : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title="Mejorar"
                  >
                    <ThumbsDown size={12} />
                    <span>Mejorar</span>
                  </button>
                  {feedbackGiven.has(message.id) && (
                    <span className="text-xs text-slate-400">✓ Gracias</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 sm:gap-2 sm:px-4">
              <Loader2 size={14} className="animate-spin text-corporate sm:h-4 sm:w-4" />
              <span className="text-xs text-slate-600 sm:text-sm">Escribiendo...</span>
            </div>
          </div>
        )}
  <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-slate-100 p-3 sm:p-4"
      >
        <div className="mb-2 flex gap-2 sm:mb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-corporate/30 bg-corporate/5 px-4 py-2 text-sm font-medium text-corporate transition-all hover:border-corporate/50 hover:bg-corporate/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>SUBIR ORDEN MÉDICA</span>
                <FileText size={16} />
              </>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu consulta..."
            className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs focus:border-corporate focus:outline-none focus:ring-2 focus:ring-corporate/20 sm:px-4 sm:text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-corporate text-white transition-all hover:bg-corporate/90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
          >
            <Send size={16} className="sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </form>
    </div>
  );
}
