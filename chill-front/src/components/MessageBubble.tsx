import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { IconRobot, IconUser, IconAlertCircle, IconDownload, IconThumbUp, IconThumbDown } from '@tabler/icons-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onFeedback }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [showButton, setShowButton] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  // Detectar si el mensaje menciona el CV
  const hasCVLink = message.text.includes('CV Guillermo German Fernandez.pdf');

  // Mostrar el botón con delay cuando hay CV (simula que el personaje lo deja)
  useEffect(() => {
    if (hasCVLink && !isUser) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 4500); // 4.5 segundos - cuando el personaje está en posición
      return () => clearTimeout(timer);
    }
  }, [hasCVLink, isUser]);

  // Función para convertir URLs en links clickeables, excluyendo el CV
  const renderTextWithLinks = (text: string) => {
    // Remover COMPLETAMENTE cualquier mención del CV PDF del texto (con o sin formato Markdown)
    let processedText = text
      .replace(/\[CV Guillermo German Fernandez\.pdf\]\([^)]*\)/g, '')  // Formato Markdown
      .replace(/CV Guillermo German Fernandez\.pdf/g, '');  // Nombre simple sin barra
    
    // Primero procesar links de Markdown [texto](url)
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:text-indigo-300 transition-colors font-medium">${linkText}</a>`;
    });
    
    // Luego procesar URLs sueltas que no estén ya en un <a>
    const urlRegex = /(?<!href=")(https?:\/\/[^\s<]+)(?!")/g;
    processedText = processedText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:text-indigo-300 transition-colors font-medium">${url}</a>`;
    });
    
    return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  const handleDownloadCV = () => {
    const link = document.createElement('a');
    link.href = '/CV Guillermo German Fernandez.pdf';
    link.download = 'CV_Guillermo_Fernandez.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group ${isUser ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
          isUser ? 'bg-gradient-to-br from-indigo-600 to-purple-600 ring-2 ring-indigo-500/30' : isError ? 'bg-red-900/50' : 'bg-gradient-to-br from-emerald-600 to-teal-600 ring-2 ring-emerald-500/30'
        }`}>
          {isUser ? (
            <IconUser className="w-5 h-5 text-white" />
          ) : isError ? (
            <IconAlertCircle className="w-5 h-5 text-red-200" />
          ) : (
            <IconRobot className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-6 py-4 rounded-2xl shadow-xl text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words transition-all hover:shadow-2xl ${
              isUser
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none'
                : isError 
                  ? 'bg-red-900/20 border border-red-800 text-red-200 rounded-tl-none'
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 text-gray-100 rounded-tl-none backdrop-blur-sm'
            }`}
          >
            {renderTextWithLinks(message.text)}
            
            {/* Botón de descarga de CV - cae desde el personaje animado */}
            {hasCVLink && !isUser && showButton && (
              <div className="mt-5 animate-drop-from-character">
                <button
                  onClick={handleDownloadCV}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <IconDownload className="w-5 h-5" />
                  Descargar CV
                </button>
              </div>
            )}
          </div>
          
          {/* 👍👎 Feedback buttons - solo para mensajes del bot */}
          {!isUser && !isError && onFeedback && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {feedbackGiven ? (
                <span className="text-xs text-gray-500">
                  {feedbackGiven === 'positive' ? '¡Gracias! 👍' : 'Gracias por el feedback 📝'}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setFeedbackGiven('positive');
                      onFeedback(message.id, 'positive');
                    }}
                    className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
                    title="Respuesta útil"
                  >
                    <IconThumbUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackGiven('negative');
                      onFeedback(message.id, 'negative');
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Respuesta no útil"
                  >
                    <IconThumbDown className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
          {/* Timestamp or Status could go here */}
        </div>
      </div>
    </div>
  );
};