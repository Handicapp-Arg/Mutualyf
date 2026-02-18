import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  MessageCircle,
  Upload,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
} from 'lucide-react';
import { ChatAIService } from '@/services/chat-ai.service';
import { BackendAPIService } from '@/services/backend-api.service';
import { MedicalOrderFormOCR, MedicalOrderData } from './medical-order-form-ocr';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState<string>('');
  const [userDNI, setUserDNI] = useState<string>('');
  const [awaitingDNI, setAwaitingDNI] = useState(false);

  // Estados para orden médica
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatService = useRef(new ChatAIService());
  const backendService = useRef(new BackendAPIService());

  useEffect(() => {
    // Cargar nombre y DNI guardados
    const savedName = localStorage.getItem('cior_user_name');
    const savedDNI = localStorage.getItem('cior_user_dni');
    if (savedName) setUserName(savedName);
    if (savedDNI) setUserDNI(savedDNI);

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
        // Mostrar efecto de "escribiendo" antes del saludo inicial
        showTypingEffect();
      }
    } catch (error) {
      // Si falla la carga, mostrar saludo inicial con efecto
      showTypingEffect();
    }
  };

  const showTypingEffect = async () => {
    // Activar indicador de carga
    setIsLoading(true);

    // Simular tiempo de "pensamiento" del bot (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsLoading(false);

    // Mensaje de bienvenida
    const welcomeMessage =
      '👋 ¡Hola! Soy Nexus, tu asistente virtual de CIOR Imágenes\n\n¿Qué necesitás hoy?\n\n🦷 Agendar turno para un estudio\n📋 Subir mi orden médica\n📍 Consultar ubicación y horarios\n📞 Información de contacto\n🔬 Conocer nuestros servicios\n\nContame en qué puedo ayudarte 😊';

    // Agregar el mensaje completo (el efecto de typing lo maneja el CSS)
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Función para limpiar markdown no soportado
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Quitar ** de bold
      .replace(/\*(.+?)\*/g, '$1'); // Quitar * de italic
  };

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

  // Detectar y validar DNI en el mensaje del usuario
  const detectAndValidateDNI = (
    text: string
  ): { dni: string; isValid: boolean } | null => {
    const trimmed = text.trim().replace(/\D/g, ''); // Solo números

    // Patrones comunes de DNI en Argentina (7-8 dígitos)
    const dniPatterns = [/(?:dni|documento)\s*:?\s*(\d{7,8})/i, /^(\d{7,8})$/];

    // Intentar extraer DNI
    for (const pattern of dniPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dni = match[1];
        const isValid = dni.length >= 7 && dni.length <= 8;
        return { dni, isValid };
      }
    }

    // Si el mensaje solo contiene números de 7-8 dígitos
    if (trimmed.length >= 7 && trimmed.length <= 8) {
      return { dni: trimmed, isValid: true };
    }

    return null;
  };

  // Detectar si el usuario está solicitando un servicio que requiere DNI
  const requiresDNI = (text: string): boolean => {
    const normalized = text.toLowerCase();
    const keywords = [
      'turno',
      'cita',
      'agendar',
      'reservar',
      'orden médica',
      'orden medica',
      'subir orden',
      'estudio',
      'tomografía',
      'tomografia',
      'radiografía',
      'radiografia',
      'cbct',
    ];
    return keywords.some((keyword) => normalized.includes(keyword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    // Si el usuario solo dice "hola" o variantes, mostrar saludo conversacional
    const normalized = inputText.trim().toLowerCase();
    if (
      [
        'hola',
        'buenas',
        'buenos días',
        'buenas tardes',
        'buenas noches',
        'buen día',
      ].includes(normalized)
    ) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText,
        timestamp: new Date(),
      };

      const greeting =
        normalized.includes('día') || normalized.includes('días')
          ? '¡Buenos días!'
          : normalized.includes('tarde')
            ? '¡Buenas tardes!'
            : normalized.includes('noche')
              ? '¡Buenas noches!'
              : '¡Hola!';

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `${greeting} Soy Nexus, tu asistente virtual de CIOR Imágenes 👋\n\n¿Qué necesitás hoy?\n\n🦷 Agendar turno para un estudio\n📋 Subir mi orden médica\n📍 Consultar ubicación y horarios\n📞 Información de contacto\n🔬 Conocer nuestros servicios\n\nContame en qué puedo ayudarte 😊`,
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      return;
    }

    // Si estamos esperando DNI, validarlo
    if (awaitingDNI) {
      const dniData = detectAndValidateDNI(inputText);

      if (dniData && dniData.isValid) {
        setUserDNI(dniData.dni);
        localStorage.setItem('cior_user_dni', dniData.dni);
        setAwaitingDNI(false);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `✅ Perfecto, registré tu DNI\n\n📝 DNI: ${dniData.dni}\n\n¿En qué más puedo ayudarte?`,
            timestamp: new Date(),
          },
        ]);
        setInputText('');
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              '⚠️ El formato del DNI no parece correcto. Por favor, ingresá solo los números de tu documento (7 u 8 dígitos). Ejemplo: 12345678',
            timestamp: new Date(),
          },
        ]);
        setInputText('');
        return;
      }
    }

    // Detectar nombre si aún no lo tenemos (solo si no es saludo)
    if (!userName) {
      const detected = detectName(inputText);
      if (detected) {
        setUserName(detected);
        localStorage.setItem('cior_user_name', detected);
      }
    }

    // Si el usuario solicita un servicio que requiere DNI y no lo tenemos, pedirlo
    if (!userDNI && requiresDNI(inputText)) {
      // Primero guardar el mensaje del usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText,
        timestamp: new Date(),
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            '📋 Para continuar, necesito tu número de DNI\n\nPor favor, ingresalo sin puntos ni espacios\n\n💡 Ejemplo: 12345678',
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      setAwaitingDNI(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let assistantContent = '';
      let isFirstChunk = true;
      // Obtener respuesta de la IA (streaming o fallback)
      for await (const chunk of chatService.current.sendMessage(inputText)) {
        // Ocultar indicador de "escribiendo" en el primer chunk
        if (isFirstChunk) {
          setIsLoading(false);
          isFirstChunk = false;
        }

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

      // 🔹 Guardar conversación en el backend después de completar la respuesta
      setMessages((prev) => {
        const finalMessages = prev;
        // Llamar a backend de forma asíncrona sin bloquear
        backendService.current
          .saveConversation(finalMessages, userName || userDNI || undefined)
          .catch((err) => console.warn('Error guardando conversación:', err));

        return finalMessages;
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            '❌ Hubo un error procesando tu consulta. Por favor, intenta nuevamente.',
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

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ Formato de archivo no válido. Solo se permiten archivos PDF, JPG y PNG.',
          timestamp: new Date(),
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ El archivo es demasiado grande. El tamaño máximo permitido es 5MB.',
          timestamp: new Date(),
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Mostrar mensaje de procesamiento
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📋 Archivo recibido: "${file.name}". \n\n🔍 Analizando orden médica con IA...`,
        timestamp: new Date(),
      },
    ]);

    setIsUploading(true);

    try {
      // Paso 1: Analizar con OCR
      const result = await backendService.current.analyzeMedicalOrder(file);

      if (result.success && result.data) {
        setPendingFile(file);
        setAnalyzedData(result.data);
        setShowOrderForm(true);

        const detectionRate = result.data.detectionRate || 0;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Análisis completado! Detecté ${detectionRate}% de los campos automáticamente. \n\nPor favor, verifica y corrige los datos si es necesario.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ ${result.message || 'No pude analizar el archivo correctamente'}. Por favor, intenta con otra imagen o PDF más claro.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ Hubo un error al analizar el archivo. Por favor, intenta nuevamente.',
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

  const handleOrderSubmit = async (orderData: MedicalOrderData) => {
    if (!pendingFile) return;

    setIsUploading(true);
    setShowOrderForm(false);

    try {
      const result = await backendService.current.uploadMedicalOrder(
        pendingFile,
        orderData
      );

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ ¡Orden médica validada exitosamente! \n\nNúmero de orden: #${result.orderId}\n\nHemos registrado tu solicitud para: ${orderData.requestedStudies.join(', ')}.\n\nNos contactaremos al ${orderData.patientPhone} para coordinar tu turno. ¿Necesitas algo más?`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ ${result.message || 'Hubo un error al procesar tu orden médica'}. Por favor, verifica los datos e intenta nuevamente.`,
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
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOrderCancel = () => {
    setShowOrderForm(false);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Carga de orden médica cancelada. ¿En qué más puedo ayudarte?',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header mejorado */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-corporate to-corporate/90 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-white">Nexus Assistant</h4>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
              <span className="text-xs text-white/90">En línea - IA activa</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:rotate-90 hover:bg-white/20"
            aria-label="Cerrar chat"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages - sin límite de altura fijo */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-corporate text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {cleanMarkdown(message.content)}
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

        {/* Indicador de "escribiendo" mejorado */}
        {isLoading && (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex justify-start duration-300">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-corporate/10">
                <MessageCircle size={16} className="text-corporate" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-slate-600">
                  Nexus está escribiendo
                </span>
                <span className="flex gap-1">
                  <span
                    className="animate-bounce text-corporate"
                    style={{ animationDelay: '0ms' }}
                  >
                    .
                  </span>
                  <span
                    className="animate-bounce text-corporate"
                    style={{ animationDelay: '150ms' }}
                  >
                    .
                  </span>
                  <span
                    className="animate-bounce text-corporate"
                    style={{ animationDelay: '300ms' }}
                  >
                    .
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input mejorado */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-slate-200 bg-white p-4"
      >
        <div className="mb-3 flex gap-2">
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-corporate/40 bg-gradient-to-r from-corporate/5 to-corporate/10 px-4 py-3 text-sm font-semibold text-corporate transition-all hover:border-corporate/60 hover:from-corporate/10 hover:to-corporate/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Subir orden médica</span>
                <FileText size={18} />
              </>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="flex-1 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-corporate focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-corporate to-corporate/90 text-white shadow-md shadow-corporate/30 transition-all hover:shadow-lg hover:shadow-corporate/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>

      {/* Formulario de validación de orden médica con OCR */}
      {showOrderForm && pendingFile && analyzedData && (
        <MedicalOrderFormOCR
          file={pendingFile}
          sessionId={backendService.current['sessionId']}
          analyzedData={analyzedData}
          onSubmit={handleOrderSubmit}
          onCancel={handleOrderCancel}
        />
      )}
    </div>
  );
}
