import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatAIService } from '@/services/chat-ai.service';
import { BackendAPIService } from '@/services/backend-api.service';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { ChatHeader } from './components/chat-header';
import { ChatMessageBubble } from './components/chat-message-bubble';
import { TypingIndicator } from './components/typing-indicator';
import { ChatInput } from './components/chat-input';
import { HumanHandoffOffer } from './components/human-handoff-offer';
import type { ChatMessage } from '@/types';
import { BACKEND_URL } from '@/lib/constants';

interface QuickButton {
  icon: string;
  label: string;
  prompt: string;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [pendingChatAttachment, setPendingChatAttachment] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showHumanOffer, setShowHumanOffer] = useState(false);
  const [humanHandoffDone, setHumanHandoffDone] = useState(false);
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
      const messagesToSave = messages.map(({ role, content, timestamp, attachment }) => ({
        role,
        content,
        timestamp,
        ...(attachment ? { attachment } : {}),
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
          history.map((msg: any, idx: number) => ({
            id: idx.toString(),
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            ...(msg.attachment ? { attachment: msg.attachment } : {}),
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
          '¡Hola! Soy MutuaBot, el asistente virtual de MutuaLyF.\n\nPuedo ayudarte con consultas sobre afiliación, especialidades, turnos, recetas, autorizaciones, pagos y trámites. Usá los botones de abajo o escribime tu consulta.',
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

      const sessionId = backendService.current['sessionId'] as string;
      for await (const chunk of chatService.current.sendMessage(promptText, {
        sessionId,
        onSuggestHuman: () => setShowHumanOffer(true),
      })) {
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
    const hasText = inputText.trim().length > 0;

    // Mientras hay un attachment pendiente, el envío de texto está bloqueado:
    // el usuario debe confirmar/cancelar el upload primero.
    if (pendingChatAttachment || !hasText || isLoading) return;

    const text = inputText.trim();
    setInputText('');

    if (adminActiveRef.current) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      return;
    }

    await sendToAI(text, text);
  };

  /** Maneja la selección de un archivo adjunto para el chat */
  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'El archivo es demasiado grande. El tamaño maximo permitido es 10MB.',
          timestamp: new Date(),
        },
      ]);
      if (attachInputRef.current) attachInputRef.current.value = '';
      return;
    }

    setPendingChatAttachment(file);
    if (attachInputRef.current) attachInputRef.current.value = '';
  };

  /**
   * Confirma el upload del archivo pendiente (con descripción opcional).
   * El bubble del usuario muestra la descripción como contenido + el attachment.
   * Si no hay admin activo y la descripción tiene texto, también se envía a la IA.
   */
  const handleConfirmAttachment = async (description: string) => {
    if (!pendingChatAttachment) return;
    const file = pendingChatAttachment;
    setIsUploadingAttachment(true);
    try {
      const result = await backendService.current.uploadChatAttachment(file, description);
      if (!result.success || !result.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `No se pudo subir el archivo: ${result.message || 'Error desconocido'}`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: description || '',
        timestamp: new Date(),
        attachment: result.data,
      };
      setMessages((prev) => [...prev, userMessage]);
      setPendingChatAttachment(null);

      // Solo encolamos respuesta de IA si hay descripción y el admin no está atendiendo
      if (!adminActiveRef.current && description.trim()) {
        setIsLoading(true);
        let assistantContent = '';
        let isFirstChunk = true;
        try {
          for await (const chunk of chatService.current.sendMessage(description)) {
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
              }
              return [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant' as const,
                  content: assistantContent,
                  timestamp: new Date(),
                },
              ];
            });
          }
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Hubo un error al procesar el archivo. Por favor, intenta nuevamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsUploadingAttachment(false);
    }
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
        const messagesToSave = currentMessages.map(({ role, content, timestamp, attachment }) => ({
          role,
          content,
          timestamp,
          ...(attachment ? { attachment } : {}),
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
            isLoading={isLoading}
            onOptionClick={handleOptionClick}
            cleanMarkdown={cleanMarkdown}
          />
        ))}
        {isLoading && <TypingIndicator />}
        {showHumanOffer && !humanHandoffDone && (
          <HumanHandoffOffer
            sessionId={backendService.current['sessionId'] as string}
            userName={userName || 'Anónimo'}
            onAccepted={() => { setHumanHandoffDone(true); setShowHumanOffer(false); }}
            onDismissed={() => setShowHumanOffer(false)}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        inputText={inputText}
        isLoading={isLoading}
        onInputChange={setInputText}
        onSubmit={handleSubmit}
        pendingAttachment={pendingChatAttachment}
        onClearAttachment={() => setPendingChatAttachment(null)}
        onAttachClick={() => attachInputRef.current?.click()}
        attachInputRef={attachInputRef}
        onAttachFile={handleAttachFile}
        onConfirmAttachment={handleConfirmAttachment}
        isUploadingAttachment={isUploadingAttachment}
      />
    </div>
  );
}
