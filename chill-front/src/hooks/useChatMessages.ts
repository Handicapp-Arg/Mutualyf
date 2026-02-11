import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { ConversationMemory } from '../utils/conversationMemory';
import { UserIdentificationSystem } from '../infrastructure/user/UserIdentificationSystem';

interface UseChatMessagesOptions {
  userSystem: UserIdentificationSystem | null;
  sessionId: string;
  onWelcome?: (msg: ChatMessage) => void;
}

export function useChatMessages({ userSystem, sessionId, onWelcome }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const conversationMemory = useRef(new ConversationMemory());
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Mensaje de bienvenida único y seguro
  useEffect(() => {
    if (!userSystem) return;
    let isMounted = true;
    async function showWelcome() {
      const session = await userSystem.getCurrentSession();
      let userName = session?.name;
      let welcomeText = '';
      if (session?.isReturningUser && userName) {
        welcomeText = `👋 ¡Hola de nuevo, ${userName}! Me alegra verte otra vez.\n\n¿En qué puedo ayudarte hoy con el portfolio de Guillermo?`;
      } else if (session?.isReturningUser) {
        welcomeText = '👋 ¡Hola de nuevo! Me alegra que regreses.\n\n¿En qué puedo ayudarte hoy con el portfolio de Guillermo?';
      } else {
        welcomeText = '👋 Hola, soy Chill, el asistente de Guillermo Fernández.\n\nAquí vas a encontrar:\n• Proyectos reales\n• Stack técnico\n• Experiencia aplicada\n• Acceso directo para agendar conversación\n\n¿Con qué te gustaría empezar?';
      }
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'model',
        text: welcomeText,
      };
      if (isMounted) {
        setMessages([welcomeMessage]);
        onWelcome?.(welcomeMessage);
      }
    }
    if (messages.length === 0) {
      showWelcome();
    }
    return () => { isMounted = false; };
  }, [userSystem, sessionId]);

  // Función para agregar mensaje
  const addMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  // Función para limpiar mensajes y mostrar bienvenida
  const clearMessages = () => {
    setMessages([]);
    conversationMemory.current.reset();
  };

  return {
    messages,
    addMessage,
    clearMessages,
    conversationMemory: conversationMemory.current,
    currentSessionId,
    setCurrentSessionId,
  };
}
