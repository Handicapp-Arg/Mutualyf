import React, { useState, useRef } from 'react';
import { ChatMessage } from '../types';

interface UseCVAnimationOptions {
  addMessage: (msg: ChatMessage) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function useCVAnimation({ addMessage, messagesEndRef }: UseCVAnimationOptions) {
  const [showCharacter, setShowCharacter] = useState(false);

  const handleDownloadCVClick = () => {
    setShowCharacter(false);
    setTimeout(() => {
      setShowCharacter(true);
      setTimeout(() => {
        setShowCharacter(false);
      }, 10000);
    }, 50);
    setTimeout(() => {
      const cvMessage: ChatMessage = {
        id: 'cv-' + Date.now(),
        role: 'model',
        text: '¡Perfecto! 📄 Aquí está el CV de Guillermo. Descargalo para ver toda su experiencia, proyectos y habilidades en detalle.\n\nCV Guillermo German Fernandez.pdf',
      };
      addMessage(cvMessage);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500);
  };

  return {
    showCharacter,
    handleDownloadCVClick,
    setShowCharacter,
  };
}
