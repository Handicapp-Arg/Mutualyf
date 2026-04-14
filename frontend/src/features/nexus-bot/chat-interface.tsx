// Mapeo de valores de servicio a nombres legibles
const SERVICIO_LABELS: Record<string, string> = {
  clinica: 'Clinica medica',
  pediatria: 'Pediatria',
  ginecologia: 'Ginecologia',
  cardiologia: 'Cardiologia',
  salud_mental: 'Salud mental',
  nutricion: 'Nutricion',
  odontologia: 'Odontologia',
  oftalmologia: 'Oftalmologia',
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
    { label: 'Servicios', value: 'servicios', icon: '🏥' },
    { label: 'Horarios y contacto', value: 'horarios_contacto', icon: '📍' },
    { label: 'Plataforma digital', value: 'plataforma', icon: '📲' },
    { label: 'Sobre MutuaLyF', value: 'sobre_nosotros', icon: 'ℹ️' },
  ];

  // Estado para autocompletar el estudio en la orden medica
  const [selectedEstudio, setSelectedEstudio] = useState<string>('');
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

  useEffect(() => {
    if (adminMessages.length > 0) {
      setMessages((prev) => [...prev, ...adminMessages]);
      clearAdminMessages();
    }
  }, [adminMessages, clearAdminMessages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    loadConversationHistory();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const timeoutId = setTimeout(() => {
      const messagesToSave = messages.map(({ role, content, timestamp }) => ({
        role,
        content,
        timestamp,
      }));
      backendService.current
        .saveConversation(messagesToSave, userNameRef.current || 'Anonimo')
        .catch((err) => {
          console.warn('Error en auto-save:', err);
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
        showTypingEffect();
      }
    } catch (error) {
      showTypingEffect();
    }
  };

  const showTypingEffect = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);

    const welcomeMessage =
      '👋 ¡Bienvenido a MutuaLyF! Soy tu asistente virtual.\n\nEstoy aca para ayudarte con informacion sobre servicios, horarios, tramites y mas. Usa los botones o escribime tu consulta.';

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        options: [
          { label: '🏥 Nuestros servicios', value: 'servicios' },
          { label: '📍 Horarios y contacto', value: 'horarios_contacto' },
          { label: '📲 Plataforma MiMutuaLyF', value: 'plataforma' },
          { label: 'ℹ️ Sobre MutuaLyF', value: 'sobre_nosotros' },
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
    let estudio = '';
    if (optionValue.startsWith('subir_orden|')) {
      estudio = optionValue.split('|')[1] || '';
      optionValue = 'subir_orden';
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: optionLabel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // SERVICIOS
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
              '🏥 Estos son los servicios de salud de MutuaLyF:\n\nSelecciona el que te interese para mas informacion:',
            timestamp: new Date(),
            options: [
              { label: '🩺 Clinica medica', value: 'clinica' },
              { label: '👶 Pediatria', value: 'pediatria' },
              { label: '👩‍⚕️ Ginecologia', value: 'ginecologia' },
              { label: '❤️ Cardiologia', value: 'cardiologia' },
              { label: '🧠 Salud mental', value: 'salud_mental' },
              { label: '🍎 Nutricion', value: 'nutricion' },
              { label: '🦷 Odontologia', value: 'odontologia' },
              { label: '👁️ Oftalmologia', value: 'oftalmologia' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // HORARIOS Y CONTACTO
    if (optionValue === 'horarios_contacto') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              '📍 Horarios y contacto de MutuaLyF:\n\n📞 Telefono: 0800 777 4413\n💬 WhatsApp: Canal habilitado para mensajeria\n\n⏰ Atencion telefonica:\nLunes a viernes de 07:30 a 19:30 hs\n\n💻 Atencion online:\nDisponible las 24 horas en la plataforma MiMutuaLyF\n\n🏢 Atencion presencial:\nEn sedes administrativas, en horario laboral',
            timestamp: new Date(),
            options: [
              { label: '📲 Conocer la plataforma MiMutuaLyF', value: 'plataforma' },
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // PLATAFORMA DIGITAL
    if (optionValue === 'plataforma') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              '📲 Plataforma digital MiMutuaLyF:\n\nSistema de autogestion para afiliados accesible desde la web.\n\n✅ Solicitud de ordenes medicas\n✅ Gestion de autorizaciones\n✅ Seguimiento de tramites\n✅ Consulta de estado de solicitudes\n✅ Pago de coseguros\n✅ Acceso a informacion personal\n\n💡 Recorda que las recetas y ordenes medicas son exclusivamente digitales y se gestionan a traves de la plataforma.',
            timestamp: new Date(),
            options: [
              { label: '💳 Medios de pago', value: 'pagos' },
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // SOBRE NOSOTROS
    if (optionValue === 'sobre_nosotros') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'ℹ️ Sobre MutuaLyF:\n\nMutual Provincial de Luz y Fuerza de Santa Fe, creada en 1999.\n\nSomos una entidad solidaria orientada a brindar servicios de salud a afiliados del sindicato de Luz y Fuerza y sus grupos familiares.\n\n🏥 Cobertura medica integral\n👨‍👩‍👧‍👦 Para afiliados y grupo familiar\n📍 Cobertura en toda la provincia de Santa Fe\n🌐 Red de prestadores en todo el pais mediante derivaciones\n💊 Cobertura de medicamentos segun plan\n🏨 Internaciones medicas y quirurgicas',
            timestamp: new Date(),
            options: [
              { label: '🏥 Ver servicios', value: 'servicios' },
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // PAGOS
    if (optionValue === 'pagos') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              '💳 Medios de pago disponibles:\n\n💳 Tarjetas de credito y debito\n📱 Mercado Pago\n🏦 Santa Fe Servicios\n🔗 Bono Link\n🏢 Pago presencial\n\nEl coseguro depende del tipo de prestacion. Algunos servicios requieren pago previo.\n\nPodes gestionar tus pagos desde la plataforma MiMutuaLyF.',
            timestamp: new Date(),
            options: [
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // DETALLE DE ESPECIALIDADES
    const servicioDescripciones: Record<string, string> = {
      clinica: 'La clinica medica abarca la atencion integral del adulto, prevencion y seguimiento de enfermedades generales.',
      pediatria: 'Pediatria: atencion medica especializada para bebes, ninos y adolescentes.',
      ginecologia: 'Ginecologia: atencion de salud reproductiva y controles periodicos para la mujer.',
      cardiologia: 'Cardiologia: diagnostico y tratamiento de enfermedades del corazon y sistema cardiovascular.',
      salud_mental: 'Salud mental: atencion psicologica y psiquiatrica para el bienestar emocional.',
      nutricion: 'Nutricion: planes alimentarios personalizados y seguimiento nutricional.',
      odontologia: 'Odontologia: atencion dental integral, prevencion y tratamientos.',
      oftalmologia: 'Oftalmologia: cuidado de la vision, diagnostico y tratamiento de enfermedades oculares.',
    };
    const mensajeFinal =
      '\n\n💡 Podes gestionar tus ordenes medicas y autorizaciones desde la plataforma MiMutuaLyF o llamando al 0800 777 4413.\n\nLa atencion es con libre eleccion dentro del padron de prestadores.';
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
              { label: '📋 Cargar orden medica', value: `subir_orden|${SERVICIO_LABELS[optionValue]}` },
              { label: '🏥 Ver otros servicios', value: 'servicios' },
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      }, 2000);
      return;
    }

    // SUBIR ORDEN
    if (optionValue === 'subir_orden') {
      fileInputRef.current?.click();
      setSelectedEstudio(estudio);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Perfecto. Selecciona el archivo de tu orden medica (imagen o PDF) para que pueda analizarla.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // VOLVER AL INICIO
    if (optionValue === 'inicio') {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '👋 ¿En que mas puedo ayudarte?',
          timestamp: new Date(),
          options: [
            { label: '🏥 Nuestros servicios', value: 'servicios' },
            { label: '📍 Horarios y contacto', value: 'horarios_contacto' },
            { label: '📲 Plataforma MiMutuaLyF', value: 'plataforma' },
            { label: '💳 Medios de pago', value: 'pagos' },
          ],
        },
      ]);
      return;
    }

    // Si el admin esta controlando, no llamar a la IA
    if (adminActiveRef.current) {
      return;
    }

    setIsLoading(true);

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

    const normalized = inputText.trim().toLowerCase();
    if (
      [
        'hola',
        'buenas',
        'buenos dias',
        'buenas tardes',
        'buenas noches',
        'buen dia',
      ].includes(normalized)
    ) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText,
        timestamp: new Date(),
      };

      const greeting =
        normalized.includes('dia') || normalized.includes('dias')
          ? '¡Buenos dias!'
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
          content: `${greeting} Soy tu asistente virtual de MutuaLyF 👋\n\n¿En que puedo ayudarte hoy?`,
          timestamp: new Date(),
          options: [
            { label: '🏥 Nuestros servicios', value: 'servicios' },
            { label: '📍 Horarios y contacto', value: 'horarios_contacto' },
            { label: '📲 Plataforma MiMutuaLyF', value: 'plataforma' },
          ],
        },
      ]);
      setInputText('');
      return;
    }

    if (normalized.includes('servicio')) {
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
            '🏥 Estos son los servicios de salud de MutuaLyF:\n\nSelecciona el que te interese:',
          timestamp: new Date(),
          options: [
            { label: '🩺 Clinica medica', value: 'clinica' },
            { label: '👶 Pediatria', value: 'pediatria' },
            { label: '👩‍⚕️ Ginecologia', value: 'ginecologia' },
            { label: '❤️ Cardiologia', value: 'cardiologia' },
            { label: '🧠 Salud mental', value: 'salud_mental' },
            { label: '🍎 Nutricion', value: 'nutricion' },
            { label: '🦷 Odontologia', value: 'odontologia' },
            { label: '👁️ Oftalmologia', value: 'oftalmologia' },
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
      for await (const chunk of chatService.current.sendMessage(inputText)) {
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ Formato de archivo no valido. Solo se permiten archivos PDF, JPG y PNG.',
          timestamp: new Date(),
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ El archivo es demasiado grande. El tamano maximo permitido es 5MB.',
          timestamp: new Date(),
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `__ANALYZING_ORDER__:${file.name}`,
        timestamp: new Date(),
      },
    ]);

    setIsUploading(true);
    setUploadProgress(0);

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
      const result = await backendService.current.analyzeMedicalOrder(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.data) {
        setPendingFile(file);
        setAnalyzedData(result.data);
        setShowOrderForm(true);

        const detectionRate = result.data.detectionRate || 0;
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => !m.content.startsWith('__ANALYZING_ORDER__')
          );
          return [
            ...filtered,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ Analisis completado! Detecte ${detectionRate}% de los campos automaticamente. \n\nPor favor, verifica y corrige los datos si es necesario.`,
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
              content: `❌ ${result.message || 'No pude analizar el archivo correctamente'}. Por favor, intenta con otra imagen o PDF mas claro.`,
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
            content: `✅ ¡Orden registrada exitosamente!\n\nNumero de orden: #${result.orderId}\nSolicitud para: ${orderData.requestedStudies.join(', ')}\n\nPodes hacer seguimiento desde la plataforma MiMutuaLyF o llamando al 0800 777 4413.\n\n¿Necesitas algo mas?`,
            timestamp: new Date(),
            options: [
              { label: '🏠 Volver al inicio', value: 'inicio' },
            ],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ ${result.message || 'Hubo un error al procesar tu orden'}. Por favor, verifica los datos e intenta nuevamente.`,
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
        content: 'Carga de orden cancelada. ¿En que mas puedo ayudarte?',
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
    const currentUserName = userNameRef.current || 'Anonimo';

    if (currentMessages.length > 0) {
      try {
        const messagesToSave = currentMessages.map(({ role, content, timestamp }) => ({
          role,
          content,
          timestamp,
        }));
        await backendService.current.saveConversation(messagesToSave, currentUserName);
      } catch (err) {
        console.error('Error guardando conversacion:', err);
      }
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
      await fetch(`${BACKEND_URL}/sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: backendService.current['sessionId'] }),
      });
    } catch (err) {
      // silencioso
    }

    isSaving.current = false;
    onClose();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden md:rounded-3xl">
      <ChatHeader adminActive={adminActive} onClose={handleClose} />

      {/* Accesos rapidos */}
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
