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

interface QuickButton {
  icon: string;
  label: string;
  prompt: string;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
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

  // Cargar quick buttons desde el backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/ai-config/public/quick-buttons`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuickButtons(data);
        }
      })
      .catch(() => {
        // silencioso - los botones no se muestran si falla
      });
  }, []);

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

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          '👋 ¡Bienvenido a MutuaLyF! Soy tu asistente virtual.\n\nEstoy aca para ayudarte con informacion sobre servicios, horarios, tramites y mas. Usa los botones o escribime tu consulta.',
        timestamp: new Date(),
      },
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanMarkdown = useCallback((text: string): string => {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
  }, []);

  /** Envía un texto a la IA via streaming y muestra la respuesta */
  const sendToAI = async (displayText: string, promptText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: displayText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let assistantContent = '';
      let isFirstChunk = true;

      for await (const chunk of chatService.current.sendMessage(promptText)) {
        if (isFirstChunk) {
          setIsLoading(false);
          isFirstChunk = false;
        }

        assistantContent += chunk;
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          if (prev[lastIdx]?.role === 'assistant' && !isFirstChunk) {
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

  const handleOptionClick = (optionValue: string, optionLabel: string) => {
    if (isLoading) return;

    // Subir orden médica - caso especial local
    let estudio = '';
    if (optionValue.startsWith('subir_orden|')) {
      estudio = optionValue.split('|')[1] || '';
      optionValue = 'subir_orden';
    }

    if (optionValue === 'subir_orden') {
      fileInputRef.current?.click();
      setSelectedEstudio(estudio);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: optionLabel,
          timestamp: new Date(),
        },
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

    // Si el admin esta controlando, no llamar a la IA
    if (adminActiveRef.current) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: optionLabel,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      return;
    }

    // Buscar si es un quick button configurado
    const matchedButton = quickButtons.find(
      (btn) => btn.label === optionValue || `${btn.icon} ${btn.label}` === optionLabel
    );

    if (matchedButton) {
      sendToAI(`${matchedButton.icon} ${matchedButton.label}`, matchedButton.prompt);
      return;
    }

    // Cualquier otro botón: enviar el label como prompt a la IA
    sendToAI(optionLabel, optionLabel);
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

    const text = inputText.trim();
    setInputText('');
    await sendToAI(text, text);
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

      {/* Accesos rapidos desde backend */}
      {quickButtons.length > 0 && (
        <div className="z-20 flex w-full gap-2 overflow-x-auto border-b border-slate-100 bg-white/90 px-3 py-2.5 backdrop-blur-sm scrollbar-hide">
          {quickButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={() =>
                handleOptionClick(btn.label, `${btn.icon} ${btn.label}`)
              }
              disabled={isLoading}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-corporate/30 hover:bg-corporate/5 hover:text-corporate active:scale-[0.97] disabled:opacity-40"
            >
              <span className="text-sm">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      )}

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
