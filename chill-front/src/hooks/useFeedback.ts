import { useState } from 'react';
import { ChatMessage } from '../types';

const FEEDBACK_OPTIONS = [
  '¿Te resultó útil la información? ¿Cómo puedo mejorar?',
  '¿Te gustaría que mis respuestas sean más concisas, detalladas o con ejemplos?',
  '¿Cómo calificarías esta conversación? Tu opinión me ayuda a mejorar.',
  '¿Hay algo que podría hacer diferente para ayudarte mejor?',
  '¿Te gustaría que adapte mi estilo de respuesta en el futuro?'
];

export function useFeedback({ addMessage, saveFeedback }) {
  const [feedbackAsked, setFeedbackAsked] = useState(false);

  const askForFeedback = () => {
    if (feedbackAsked) return;
    setFeedbackAsked(true);
    const phrase = FEEDBACK_OPTIONS[Math.floor(Math.random() * FEEDBACK_OPTIONS.length)];
    addMessage({
      id: 'feedback-' + Date.now(),
      role: 'model',
      text: phrase,
    });
  };

  const handleFeedbackResponse = (text: string, userSession: any) => {
    saveFeedback({
      feedback: text,
      userSession,
      timestamp: Date.now(),
    });
  };

  return { askForFeedback, handleFeedbackResponse };
}
