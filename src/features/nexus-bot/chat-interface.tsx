import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Upload, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { BotFace } from './bot-face';
import { ChatAIService } from '@/services/chat-ai.service';
import { BackendAPIService } from '@/services/backend-api.service';
import { MedicalOrderFormOCR, MedicalOrderData } from './medical-order-form-ocr';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: Array<{ label: string; value: string }>;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  // Declaración única de todos los hooks y refs
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatService = useRef(new ChatAIService());
  const backendService = useRef(new BackendAPIService());
  const isSaving = useRef(false);
  const isInitialized = useRef(false);
  const messagesRef = useRef(messages);
  const userNameRef = useRef(userName);

  // Mantener refs actualizados
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // Inicializar solo una vez
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Cargar historial del backend
    loadConversationHistory();

    // NO guardar en el cleanup del useEffect, solo al cerrar explícitamente
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

    // Mensaje de bienvenida con opciones
    const welcomeMessage =
      '👋 ¡Hola! Soy Nexus, tu asistente virtual de CIOR Imágenes\n\n¿Qué necesitás hoy?';

    // Agregar el mensaje con opciones
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        options: [
          { label: '📋 Subir orden médica', value: 'subir_orden' },
          { label: '📍 Ubicación y horarios', value: 'ubicacion_horarios' },
          { label: '📞 Información de contacto', value: 'contacto' },
          { label: '🔬 Conocer servicios', value: 'servicios' },
          { label: '⏰ Atención por orden de llegada', value: 'orden_llegada' },
        ],
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

  const handleOptionClick = (optionValue: string, optionLabel: string) => {
    // Agregar mensaje del usuario con la opción seleccionada
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: optionLabel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Si selecciona "Conocer servicios", mostrar botones de servicios
    if (optionValue === 'servicios') {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            '🔬 Estos son nuestros servicios de diagnóstico por imágenes:\n\nSeleccioná el que te interese para más información:',
          timestamp: new Date(),
          options: [
            { label: '🦷 CBCT (Tomografía Dental)', value: 'cbct' },
            { label: '📷 Radiografías Dentales', value: 'radiografias' },
            { label: '🔍 Panorámicas', value: 'panoramicas' },
            { label: '📸 Telerradiografías', value: 'telerradiografias' },
            { label: '💀 Estudios ATM', value: 'atm' },
            { label: '🎯 Cefalometrías', value: 'cefalometrias' },
          ],
        },
      ]);
      return;
    }

    setIsLoading(true);

    // Simular procesamiento y enviar a la IA
    setTimeout(async () => {
      try {
        let assistantContent = '';
        let isFirstChunk = true;

        for await (const chunk of chatService.current.sendMessage(optionLabel)) {
          if (isFirstChunk) {
            setIsLoading(false);
            isFirstChunk = false;
          }

          assistantContent += chunk;
          setMessages((prev) => {
            const lastIdx = prev.length - 1;
            if (prev[lastIdx]?.role === 'assistant') {
              return [
                ...prev.slice(0, lastIdx),
                { ...prev[lastIdx], content: assistantContent },
              ];
            } else {
              return [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant' as const,
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
            content:
              '❌ Hubo un error procesando tu consulta. Por favor, intenta nuevamente.',
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
      }
    }, 100);
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
          content: `${greeting} Soy Nexus, tu asistente virtual de CIOR Imágenes 👋\n\n¿Qué necesitás hoy?`,
          timestamp: new Date(),
          options: [
            { label: '📋 Subir orden médica', value: 'subir_orden' },
            { label: '📍 Ubicación y horarios', value: 'ubicacion_horarios' },
            { label: '📞 Información de contacto', value: 'contacto' },
            { label: '🔬 Conocer servicios', value: 'servicios' },
            { label: '⏰ Atención por orden de llegada', value: 'orden_llegada' },
          ],
        },
      ]);
      setInputText('');
      return;
    }

    // Si pregunta por servicios específicamente, mostrar lista con botones
    if (normalized.includes('servicio') || normalized.includes('🔬 conocer servicios')) {
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
            '🔬 Estos son nuestros servicios de diagnóstico por imágenes:\n\nSeleccioná el que te interese para más información:',
          timestamp: new Date(),
          options: [
            { label: '🦷 CBCT (Tomografía Dental)', value: 'cbct' },
            { label: '📷 Radiografías Dentales', value: 'radiografias' },
            { label: '🔍 Panorámicas', value: 'panoramicas' },
            { label: '📸 Telerradiografías', value: 'telerradiografias' },
            { label: '💀 Estudios ATM', value: 'atm' },
            { label: '🎯 Cefalometrías', value: 'cefalometrias' },
          ],
        },
      ]);
      setInputText('');
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
          const lastIdx = prev.length - 1;
          if (prev[lastIdx]?.role === 'assistant') {
            return [
              ...prev.slice(0, lastIdx),
              { ...prev[lastIdx], content: assistantContent },
            ];
          } else {
            return [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
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

    // Guardar nombre y apellido del paciente de la orden médica
    if (orderData.patientName) {
      const fullName =
        `${orderData.patientName} ${orderData.patientLastName || ''}`.trim();
      setUserName(fullName);
    }

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
            content: `✅ ¡Orden médica validada exitosamente! \n\nNúmero de orden: #${result.orderId}\n\nHemos registrado tu solicitud para: ${orderData.requestedStudies.join(', ')}.\n\n🏥 Podés acercarte directamente a CIOR en nuestro horario de atención. Ya tenemos tu orden cargada, lo que agilizará tu atención en mesa de entrada.\n\n📍 Balcarce 1001, Rosario\n⏰ Lunes a Viernes: 8:00 a 19:00\n\n¿Necesitas algo más?`,
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

  const handleClose = async () => {
    if (isSaving.current) {
      onClose();
      return;
    }

    isSaving.current = true;
    const currentMessages = messagesRef.current;
    const currentUserName = userNameRef.current || 'Anónimo';

    console.log('💾 Guardando conversación:', {
      totalMensajes: currentMessages.length,
      userName: currentUserName,
      mensajes: currentMessages.map((m) => ({
        role: m.role,
        content: m.content.substring(0, 30),
      })),
    });

    // Guardar conversación antes de cerrar
    if (currentMessages.length > 0) {
      try {
        // Filtrar solo las propiedades necesarias (sin options)
        const messagesToSave = currentMessages.map(({ role, content, timestamp }) => ({
          role,
          content,
          timestamp,
        }));
        await backendService.current.saveConversation(messagesToSave, currentUserName);
        console.log('✅ Conversación guardada exitosamente');
      } catch (err) {
        console.error('❌ Error guardando conversación:', err);
      }
    }

    isSaving.current = false;
    onClose();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl">
      {/* Header mejorado */}
      <div className="relative z-10 flex-shrink-0 border-b border-slate-200 bg-corporate p-4">
        <div className="flex items-center gap-3">
          {/* Icono de Muelita en Header */}
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white shadow-inner">
            <div className="h-[140%] w-[140%]">
              <BotFace />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-white drop-shadow-sm">
              Nexus Assistant
            </h4>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              <span className="text-xs font-medium text-white/90">
                En línea - IA activa
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:rotate-90 hover:scale-110 hover:bg-white/20 active:scale-95"
            aria-label="Cerrar chat"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Mensajes con estilo chat moderno y limpio */}
      <div className="relative z-10 flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-28 pt-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <div
              className={`flex max-w-[85%] flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`px-5 py-3.5 shadow-sm ${
                  message.role === 'user'
                    ? 'rounded-[20px] rounded-tr-sm bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                    : 'rounded-[20px] rounded-tl-sm bg-white text-slate-700'
                }`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {cleanMarkdown(message.content)}
                </p>
              </div>

              {/* Botones de opciones */}
              {message.options && message.options.length > 0 && (
                <div className="mt-3 flex w-full flex-col gap-2">
                  {message.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOptionClick(option.value, option.label)}
                      disabled={isLoading}
                      className="rounded-xl border-2 border-cyan-500 bg-white px-4 py-3 text-left text-sm font-medium text-cyan-600 shadow-sm transition-all hover:scale-[1.02] hover:bg-cyan-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp discreto */}
              <span
                className={`mt-1 px-1 text-[10px] ${message.role === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-400'}`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Indicador de "escribiendo" mejorado */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-200/40">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-corporate"
                >
                  <path
                    d="M8.5 2C6.5 2 5 3.5 5 5.5V8c0 1.5 1 2.5 1.5 3c-1 1-1.5 2.5-1.5 4v3c0 1.5 1.5 3 3 3h.5c1 0 1.5-.5 1.5-1.5V16c0-.5.5-1 1-1s1 .5 1 1v3.5c0 1 .5 1.5 1.5 1.5h.5c1.5 0 3-1.5 3-3v-3c0-1.5-.5-3-1.5-4c.5-.5 1.5-1.5 1.5-3V5.5C19 3.5 17.5 2 15.5 2c-1.5 0-2.5 1-3.5 2c-1-1-2-2-3.5-2z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-slate-600">
                  Nexus está escribiendo
                </span>
                <span className="flex gap-1">
                  <span className="text-cyan-400">.</span>
                  <span className="text-cyan-400">.</span>
                  <span className="text-cyan-400">.</span>
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input y botón flotantes, fuera del recuadro, con glass y glow */}
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center bg-gradient-to-t from-white to-transparent p-4 pb-6"
      >
        <div className="relative flex w-full max-w-xl items-end gap-2 drop-shadow-2xl">
          {/* Botón de subir archivo flotante */}
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-cyan-500 shadow-lg ring-1 ring-cyan-100 transition-all hover:bg-cyan-50 active:scale-95"
          >
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Upload size={20} />
            )}
          </button>

          <div className="relative flex-1 rounded-[24px] bg-white shadow-xl ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-cyan-400/50">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-adjust height
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Escribí tu consulta..."
              className="flex max-h-[120px] min-h-[50px] w-full resize-none bg-transparent px-5 py-3.5 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} className="ml-0.5" />
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
