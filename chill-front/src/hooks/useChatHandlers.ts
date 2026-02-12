import { useCallback } from 'react';
import { ChatMessage } from '../types';

interface UseChatHandlersOptions {
  clearMessages: () => void;
  addMessage: (msg: ChatMessage) => void;
}

export function useChatHandlers({ clearMessages, addMessage }: UseChatHandlersOptions) {
  // Handler para limpiar el chat y mostrar bienvenida
  const handleClearChat = useCallback(() => {
    clearMessages();
    const welcomeMessage: ChatMessage = {
      id: 'welcome-' + Date.now(),
      role: 'model',
      text: '¡Perfecto! 🎉 Listo para contarte todo sobre Guillermo. ¿Qué te interesa saber de su perfil profesional?',
    };
    addMessage(welcomeMessage);
  }, [clearMessages, addMessage]);

  // Handler para errores en el chat
  const handleErrorMessage = useCallback(() => {
    const errorMessage: ChatMessage = {
      id: (Date.now() + 2).toString(),
      role: 'model',
      text: "😅 ¡Ups! Parece que hubo un error. Por favor, intentá más tarde o contactá directamente:\n\n📧 Email: guille.fernandeeez@gmail.com\n📅 Calendly: [Agendar reunión](https://calendly.com/guille-fernandeeez/30min)\n💼 LinkedIn: [Ver perfil](https://www.linkedin.com/in/guillermo-fernandez-developer)",
      isError: true
    };
    addMessage(errorMessage);
  }, [addMessage]);

  return {
    handleClearChat,
    handleErrorMessage,
  };
}
