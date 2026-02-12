import React, { useState, useRef, useEffect } from 'react';
import { useUserSession } from './hooks/useUserSession';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatHandlers } from './hooks/useChatHandlers';
import { useCVAnimation } from './hooks/useCVAnimation';
import { useSubmitHandler } from './hooks/useSubmitHandler';
import { useFeedback } from './hooks/useFeedback';
import { MessageBubble } from './components/MessageBubble';
import MovingCharacter from './MovingCharacter/MovingCharacter';
import { IconSend, IconTrash, IconCalendar, IconDownload, IconCode, IconBriefcase, IconRocket, IconSparkles, IconUser, IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { useAnalytics } from './hooks/useAnalytics';
import { ChatMessage } from './types';
import { saveFeedback } from './services/feedbackService';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { userSystem, session, sessionId } = useUserSession();
  const { messages, addMessage, clearMessages, conversationMemory } = useChatMessages({
    userSystem,
    sessionId,
    onWelcome: (msg) => {
      // ...trackers y callbacks...
    }
  });
  const {
    trackChatMessage,
    trackQuickAction,
    trackCVDownload,
    trackInterviewScheduled,
    trackUserIdentified,
    trackConversationStarted,
    trackError,
    trackPageView
  } = useAnalytics();

  const { handleClearChat, handleErrorMessage } = useChatHandlers({ clearMessages, addMessage });

  const {
    showCharacter,
    handleDownloadCVClick,
    setShowCharacter,
  } = useCVAnimation({ addMessage, messagesEndRef });

  const { handleSubmit } = useSubmitHandler({
    addMessage,
    setInputText,
    setIsLoading,
    setIsGenerating,
    isLoading,
    inputText,
    handleErrorMessage,
    handleDownloadCVClick,
    sessionId,  // Pasar sessionId para guardar conversaciones
    messages,   // Historial de mensajes para detección contextual de nombres
  });

  // 🎯 Sistema de Feedback
  const { askForFeedback, handleFeedbackResponse } = useFeedback({ 
    addMessage, 
    saveFeedback 
  });

  // 📊 Pedir feedback después de 5 mensajes del usuario
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  useEffect(() => {
    if (userMessageCount === 5) {
      // Esperar un poco antes de pedir feedback
      const timer = setTimeout(() => {
        askForFeedback();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userMessageCount]);

  // 👍👎 Manejar feedback rápido (thumbs up/down)
  const handleQuickFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // Encontrar el mensaje del usuario anterior
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
    
    try {
      await saveFeedback({
        feedback,
        userMessage: userMessage?.text || '',
        botResponse: message.text,
        userSession: session,
        timestamp: Date.now(),
      });
      console.log(`✅ Feedback ${feedback} guardado para mensaje ${messageId}`);
    } catch (error) {
      console.error('Error guardando feedback:', error);
    }
  };

  const handleStopGeneration = () => {
    // ...
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 overflow-hidden font-sans relative">
      {/* Personaje animado */}
  <MovingCharacter isActive={showCharacter} imageUrl={undefined} />
      
      {/* Header Moderno */}
      <header className="relative px-4 md:px-6 py-4 bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl border-b border-gray-700/30 shrink-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Profile Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-500">
                <img 
                  src="/Captura desde 2025-12-11 10-48-04.png" 
                  alt="Guillermo Fernández" 
                  className="w-full h-full rounded-2xl object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-gray-900">
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="font-bold text-xl md:text-2xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Guillermo Fernández
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="font-medium">Full Stack Developer</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearChat}
              className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-300 group"
              title="Nueva conversación"
            >
              <IconTrash className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Actions Bar */}
      <section className="px-4 md:px-6 py-3 bg-gradient-to-r from-gray-900/50 via-gray-800/30 to-gray-900/50 backdrop-blur-sm border-b border-gray-700/20 shrink-0">
        <div className="flex items-center gap-3 max-w-6xl mx-auto overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              // ...
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300 hover:bg-blue-500/20 transition-all whitespace-nowrap"
          >
            Proyectos
          </button>
          
          <button
            onClick={() => {
              // ...
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-300 hover:bg-purple-500/20 transition-all whitespace-nowrap"
          >
            Tecnologías
          </button>
          
          <a 
            href="https://calendly.com/guille-fernandeeez/30min" 
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInterviewScheduled('button')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-sm text-indigo-300 hover:bg-indigo-500/30 transition-all whitespace-nowrap"
          >
            Entrevista
          </a>
          
          <button
            onClick={handleDownloadCVClick}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all whitespace-nowrap"
          >
            Descargar CV
          </button>
        </div>
      </section>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-gradient-to-b from-gray-950/30 to-gray-900/30">
        <div className="max-w-5xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 animate-fade-in">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-gray-700/30 shadow-2xl">
                  <IconSparkles className="w-16 h-16 text-indigo-400 animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <IconUser className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  ¡Conversemos sobre el futuro! 🚀
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Soy Chill, el asistente especializado de Guillermo. Estoy aquí para contarte todo sobre su experiencia, proyectos y habilidades técnicas.
                </p>
              </div>

              {/* Sugerencias de preguntas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                <button
                  onClick={() => {
                    setInputText('¿Cuáles son los proyectos más importantes que has desarrollado?');
                    trackQuickAction('empty_state_projects');
                  }}
                  className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl text-left hover:bg-blue-500/20 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-3">
                    <IconBriefcase className="w-6 h-6 text-blue-400 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-semibold text-blue-300 mb-1">Proyectos destacados</h3>
                      <p className="text-sm text-gray-400">Explora los proyectos en producción y casos de éxito</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setInputText('¿Qué tecnologías y herramientas dominas?');
                    trackQuickAction('empty_state_technologies');
                  }}
                  className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl text-left hover:bg-purple-500/20 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-3">
                    <IconRocket className="w-6 h-6 text-purple-400 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-semibold text-purple-300 mb-1">Stack técnico</h3>
                      <p className="text-sm text-gray-400">Descubre las tecnologías y frameworks que maneja</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setInputText('¿Cómo puedo contactar y agendar una entrevista?');
                    trackQuickAction('empty_state_interview');
                  }}
                  className="p-4 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl text-left hover:bg-indigo-500/20 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-3">
                    <IconCalendar className="w-6 h-6 text-indigo-400 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-semibold text-indigo-300 mb-1">Agendar entrevista</h3>
                      <p className="text-sm text-gray-400">Programa una conversación técnica directa</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setInputText('Necesito el CV completo');
                    trackQuickAction('empty_state_cv');
                  }}
                  className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl text-left hover:bg-emerald-500/20 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-3">
                    <IconDownload className="w-6 h-6 text-emerald-400 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-semibold text-emerald-300 mb-1">Descargar CV</h3>
                      <p className="text-sm text-gray-400">Obtén el currículum completo en PDF</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  onFeedback={handleQuickFeedback}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                 <div className="flex justify-start mb-6 animate-pulse">
                     <div className="flex items-center gap-2 bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-700">
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                     </div>
                 </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 md:p-6 bg-gradient-to-t from-gray-900/95 via-gray-900/90 to-gray-900/80 backdrop-blur-xl border-t border-gray-700/30 shrink-0">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-3 bg-gradient-to-r from-gray-950/90 to-gray-900/90 backdrop-blur-sm p-4 rounded-2xl border border-gray-700/40 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-2xl hover:shadow-indigo-500/10">
            
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Escribe tu pregunta aquí... ¿Qué te gustaría saber?"
                className="w-full bg-transparent text-gray-100 placeholder-gray-500 p-3 pr-20 max-h-32 min-h-[60px] resize-none focus:outline-none text-base scrollbar-hide rounded-xl"
                rows={1}
                style={{ minHeight: '60px' }}
              />
              
              {/* Character counter */}
              {inputText.length > 50 && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded">
                  {inputText.length}/500
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isGenerating && (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="p-4 rounded-2xl flex-shrink-0 transition-all duration-300 bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
                  title="Detener generación"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                </button>
              )}
              
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`p-4 rounded-2xl flex-shrink-0 transition-all duration-300 relative overflow-hidden ${
                  inputText.trim() && !isLoading
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105'
                    : 'bg-gray-800/80 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconSend className="w-6 h-6" />
                )}
              </button>
            </div>
          </form>
          
          {/* Hint text */}
          <div className="flex justify-center mt-3">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800/50 border border-gray-700/50 rounded text-xs">Enter</kbd>
              para enviar •
              <kbd className="px-2 py-1 bg-gray-800/50 border border-gray-700/50 rounded text-xs">Shift+Enter</kbd>
              nueva línea
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}