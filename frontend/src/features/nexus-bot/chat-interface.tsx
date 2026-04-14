// Mapeo de valores de servicio a nombres legibles
const SERVICIO_LABELS: Record<string, string> = {
  cbct: 'CBCT (Tomografía Dental)',
  radiografias: 'Radiografías Dentales',
  panoramicas: 'Panorámicas',
  telerradiografias: 'Telerradiografías',
  atm: 'ATM (Articulación Temporomandibular)',
  cefalometrias: 'Cefalometrías',
};
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatAIService } from '@/services/chat-ai.service';
import { BackendAPIService } from '@/services/backend-api.service';
import { MedicalOrderFormOCR, MedicalOrderData } from './medical-order-form-ocr';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { ChatHeader } from './components/chat-header';
import { ChatMessageBubble } from './components/chat-message-bubble';
import { TypingIndicator } from './components/typing-indicator';
import { ChatInput } from './components/chat-input';
import type { ChatMessage } from '@/types';

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  // Opciones principales siempre visibles arriba del chat
  const mainOptions = [
    { label: 'Servicios', value: 'servicios', icon: '🔬' },
    { label: 'Ubicación y horarios', value: 'ubicacion_horarios', icon: '📍' },
    { label: 'Contacto', value: 'contacto', icon: '📞' },
    { label: 'Sobre nosotros', value: 'sobre_nosotros', icon: 'ℹ️' },
  ];
  // ...existing code...
  // Estado para autocompletar el estudio en la orden médica
  const [selectedEstudio, setSelectedEstudio] = useState<string>('');
  // Declaración única de todos los hooks y refs
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_isUploading, setIsUploading] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatService = useRef(new ChatAIService());
  const backendService = useRef(new BackendAPIService());
  const isSaving = useRef(false);
  const isInitialized = useRef(false);
  const messagesRef = useRef(messages);
  const userNameRef = useRef(userName);

  // Socket.io + heartbeat via hook
  const { adminActive, adminActiveRef, adminMessages, clearAdminMessages } = useChatSocket({
    sessionId: backendService.current['sessionId'],
    userName,
  });

  // Integrar mensajes del admin en el chat
  useEffect(() => {
    if (adminMessages.length > 0) {
      setMessages((prev) => [...prev, ...adminMessages]);
      clearAdminMessages();
    }
  }, [adminMessages, clearAdminMessages]);

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

  // Auto-guardado en vivo: cada vez que cambia el array de mensajes,
  // se reprograma un save 800ms después. El debounce evita guardar en cada
  // chunk durante el streaming — solo guarda cuando el estado se asienta.
  useEffect(() => {
    if (messages.length === 0) return;

    const timeoutId = setTimeout(() => {
      const messagesToSave = messages.map(({ role, content, timestamp }) => ({
        role,
        content,
        timestamp,
      }));
      backendService.current
        .saveConversation(messagesToSave, userNameRef.current || 'Anónimo')
        .catch((err) => {
          console.warn('⚠️ Error en auto-save:', err);
        });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [messages]);

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

        // Mensaje de bienvenida actualizado
        const welcomeMessage =
  '👋 ¡Bienvenido a Mutual Luz y Fuerza! Soy tu asistente virtual.\n\nEstoy acá para acompañarte y darte información clara y rápida. Usá los botones para navegar o escribime tu consulta.';

    // Agregar el mensaje con opciones simplificadas
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        options: [
          { label: '🔬 Conocer nuestros servicios', value: 'servicios' },
          { label: '📍 Ubicación y horarios', value: 'ubicacion_horarios' },
          { label: '📞 Información de contacto', value: 'contacto' },
          { label: 'ℹ️ Sobre nosotros', value: 'sobre_nosotros' },
        ],
      },
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanMarkdown = useCallback((text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1');
  }, []);

  const handleOptionClick = (optionValue: string, optionLabel: string) => {
    // Si el valor es subir_orden|servicio, extraer el nombre del estudio
    let estudio = '';
    if (optionValue.startsWith('subir_orden|')) {
      estudio = optionValue.split('|')[1] || '';
      optionValue = 'subir_orden';
    }
    // Agregar mensaje del usuario con la opción seleccionada
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: optionLabel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Si selecciona "Conocer servicios", mostrar loader 5s y luego los botones de servicios
    if (optionValue === 'servicios') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
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
      }, 5000);
      return;
    }

    // Si selecciona "Ubicación y horarios", mostrar loader 5s y luego la respuesta correcta
    if (optionValue === 'ubicacion_horarios') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Nuestra ubicación es:\n📍 Balcarce 1001, Rosario, Santa Fe, Argentina\n\nNuestros horarios de atención son:\n⏰ Lunes a Viernes de 8:00 a 19:00hs\n\nNo trabajamos con turnos, la atención es por orden de llegada. Podés acercarte directamente en ese horario. ',
            timestamp: new Date(),
          },
        ]);
      }, 5000);
      return;
    }

    // Si selecciona un servicio, mostrar solo la versión breve y el mensaje para subir orden
    const servicioDescripciones: Record<string, string> = {
      cbct: 'La tomografía CBCT es un estudio de imágenes 3D de la zona dental y maxilofacial, útil para diagnósticos precisos en odontología.',
      radiografias: 'Las radiografías dentales permiten ver los dientes y estructuras cercanas para detectar caries, infecciones o problemas óseos.',
      panoramicas: 'La panorámica es una radiografía que muestra toda la boca en una sola imagen, útil para evaluaciones generales.',
      telerradiografias: 'La telerradiografía es una radiografía lateral del cráneo, utilizada principalmente en ortodoncia.',
      atm: 'El estudio ATM evalúa la articulación de la mandíbula para detectar alteraciones funcionales o estructurales.',
      cefalometrias: 'La cefalometría es una radiografía del cráneo usada para análisis ortodóncicos y planificación de tratamientos.',
    };
    const mensajeFinal =
      '\n\n💡 Para brindarte una atención más rápida y eficiente, lo ideal es que subas tu orden médica directamente por este chat. Así podremos prepararnos antes de tu visita y evitar demoras.\n\n¿Querés cargar tu orden ahora o tenés alguna pregunta sobre el procedimiento? ¡Estoy acá para ayudarte!';
    if (Object.keys(servicioDescripciones).includes(optionValue)) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: servicioDescripciones[optionValue] + mensajeFinal,
            timestamp: new Date(),
            options: [
              { label: '📋 Sí, cargar orden ahora', value: `subir_orden|${SERVICIO_LABELS[optionValue]}` },
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 5000);
      return;
    }

    // Si selecciona subir orden, abrir selector de archivos
    if (optionValue === 'subir_orden') {
      fileInputRef.current?.click();
      // Guardar el estudio seleccionado para autocompletar en el formulario
      setSelectedEstudio(estudio);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Perfecto. Seleccioná el archivo de tu orden médica (imagen o PDF) para que pueda analizarla.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Si selecciona inicio, mostrar menú principal
    if (optionValue === 'inicio') {
      const welcomeMessage =
        '👋 ¡Hola de nuevo! Soy tu asistente virtual.\n\n¿En qué puedo ayudarte?';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
          options: [
            { label: '🔬 Conocer nuestros servicios', value: 'servicios' },
            { label: '📍 Ubicación y horarios', value: 'ubicacion_horarios' },
            { label: '📞 Información de contacto', value: 'contacto' },
          ],
        },
      ]);
      return;
    }

    // Si el admin está controlando, no llamar a la IA
    if (adminActiveRef.current) {
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

        // Si fue una consulta de servicio, ofrecer cargar orden
        if (Object.keys(SERVICIO_LABELS).includes(optionValue)) {
          const servicioDescripciones: Record<string, string> = {
            cbct: 'La tomografía CBCT es un estudio de imágenes 3D de la zona dental y maxilofacial, útil para diagnósticos precisos en odontología.',
            radiografias: 'Las radiografías dentales permiten ver los dientes y estructuras cercanas para detectar caries, infecciones o problemas óseos.',
            panoramicas: 'La panorámica es una radiografía que muestra toda la boca en una sola imagen, útil para evaluaciones generales.',
            telerradiografias: 'La telerradiografía es una radiografía lateral del cráneo, utilizada principalmente en ortodoncia.',
            atm: 'El estudio ATM evalúa la articulación de la mandíbula para detectar alteraciones funcionales o estructurales.',
            cefalometrias: 'La cefalometría es una radiografía del cráneo usada para análisis ortodóncicos y planificación de tratamientos.',
          };
          const mensajeFinal =
            '\n\n💡 Para brindarte una atención más rápida y eficiente, lo ideal es que subas tu orden médica directamente por este chat. Así podremos prepararnos antes de tu visita y evitar demoras.\n\n¿Querés cargar tu orden ahora o tenés alguna pregunta sobre el procedimiento? ¡Estoy acá para ayudarte!';
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content:
                  servicioDescripciones[optionValue] + mensajeFinal,
                timestamp: new Date(),
                options: [
                  { label: '📋 Sí, cargar orden ahora', value: `subir_orden|${SERVICIO_LABELS[optionValue]}` },
                  { label: '🏠 Volver al inicio', value: 'inicio' },
                ],
              },
            ]);
          }, 500);
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

    // Si admin está activo, solo enviar el mensaje del usuario (sin respuesta del bot)
    if (adminActiveRef.current) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      return;
    }

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
      const userMessage: ChatMessage = {
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
          content: `${greeting} Soy tu asistente virtual de Mutual Luz y Fuerza 👋\n\n¿En qué puedo ayudarte hoy? Seleccioná una opción para comenzar:`,
          timestamp: new Date(),
          options: [
            { label: '🔬 Conocer nuestros servicios', value: 'servicios' },
            { label: '📍 Ubicación y horarios', value: 'ubicacion_horarios' },
            { label: '📞 Información de contacto', value: 'contacto' },
          ],
        },
      ]);
      setInputText('');
      return;
    }

    // Si pregunta por servicios específicamente, mostrar lista con botones
    if (normalized.includes('servicio') || normalized.includes('🔬 conocer servicios')) {
      const userMessage: ChatMessage = {
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

    const userMessage: ChatMessage = {
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

    // Mostrar mensaje de procesamiento con efectos visuales
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `__ANALYZING_ORDER__:${file.name}`, // Marcador especial para renderizado customizado
        timestamp: new Date(),
      },
    ]);

    setIsUploading(true);
    setUploadProgress(0);

    // Animar progreso de 0 a 90% durante la carga
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      // Paso 1: Analizar con OCR
      const result = await backendService.current.analyzeMedicalOrder(file);

      // Completar al 100%
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.data) {
        setPendingFile(file);
        setAnalyzedData(result.data);
        setShowOrderForm(true);

        const detectionRate = result.data.detectionRate || 0;
        // Reemplazar el mensaje de "analizando" con el resultado
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => !m.content.startsWith('__ANALYZING_ORDER__')
          );
          return [
            ...filtered,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ Análisis completado! Detecté ${detectionRate}% de los campos automáticamente. \n\nPor favor, verifica y corrige los datos si es necesario.`,
              timestamp: new Date(),
            },
          ];
        });
      } else {
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => !m.content.startsWith('__ANALYZING_ORDER__')
          );
          return [
            ...filtered,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `❌ ${result.message || 'No pude analizar el archivo correctamente'}. Por favor, intenta con otra imagen o PDF más claro.`,
              timestamp: new Date(),
            },
          ];
        });
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.content.startsWith('__ANALYZING_ORDER__'));
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '❌ Hubo un error al analizar el archivo. Por favor, intenta nuevamente.',
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
      const fullName = orderData.patientName.trim();
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
            content: `✅ ¡Orden validada exitosamente! \n\nNúmero de orden: #${result.orderId}\n\nHemos registrado tu solicitud para: ${orderData.requestedStudies.join(', ')}.\n\n¿Necesitas algo más?`,
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

    // Marcar la sesión como inactiva en el backend para que desaparezca
    // de "en vivo" inmediatamente (sin esperar el timeout de 60s)
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
      await fetch(`${BACKEND_URL}/sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: backendService.current['sessionId'] }),
      });
    } catch (err) {
      console.warn('⚠️ No se pudo marcar la sesión como cerrada:', err);
    }

    isSaving.current = false;
    onClose();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden md:rounded-3xl">
      <ChatHeader adminActive={adminActive} onClose={handleClose} />

      {/* Accesos rápidos */}
      <div className="z-20 flex w-full gap-2 overflow-x-auto border-b border-slate-100 bg-white/90 px-3 py-2.5 backdrop-blur-sm scrollbar-hide">
        {mainOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionClick(option.value, `${option.icon} ${option.label}`)}
            disabled={isLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-corporate/30 hover:bg-corporate/5 hover:text-corporate active:scale-[0.97] disabled:opacity-40"
          >
            <span className="text-sm">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Mensajes */}
      <div className="scrollbar-hide relative z-10 flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-28 pt-4">
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            uploadProgress={uploadProgress}
            isLoading={isLoading}
            onOptionClick={handleOptionClick}
            cleanMarkdown={cleanMarkdown}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        inputText={inputText}
        isLoading={isLoading}
        onInputChange={setInputText}
        onSubmit={handleSubmit}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
      />

      {showOrderForm && pendingFile && analyzedData && (
        <MedicalOrderFormOCR
          file={pendingFile}
          sessionId={backendService.current['sessionId']}
          analyzedData={analyzedData}
          estudio={selectedEstudio}
          onSubmit={handleOrderSubmit}
          onCancel={handleOrderCancel}
        />
      )}
    </div>
  );
}
