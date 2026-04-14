import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

import { BotGreeting } from './bot-greeting';
import { ChatInterface } from './chat-interface';

/**
 * Asistente Virtual - Mutual Luz y Fuerza
 * Bot flotante moderno y minimalista
 */

export function NexusBot() {
  const [isBotActive, setIsBotActive] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);

  const greetingMessages = [
    '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
    'Estoy aquí para ayudarte, ¿qué necesitas?',
    '¿Tienes alguna consulta? ¡Estoy para ayudarte!',
    '¿Necesitas ayuda con algo?',
    'No dudes en preguntarme lo que quieras.',
  ];

  useEffect(() => {
    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;
    let cycleTimeout: NodeJS.Timeout;

    showTimeout = setTimeout(() => {
      setShowGreeting(true);
      hideTimeout = setTimeout(() => {
        setShowGreeting(false);
        cycleTimeout = setTimeout(() => {
          setGreetingIndex((prev) => (prev + 1) % greetingMessages.length);
          setShowGreeting(true);
        }, 15000);
      }, 15000);
    }, 2000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(cycleTimeout);
    };
  }, [greetingIndex]);

  const handleToggle = () => {
    setIsBotActive(!isBotActive);
    setShowGreeting(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
        {/* Burbuja de Saludo */}
        <BotGreeting
          show={showGreeting && !isBotActive}
          message={greetingMessages[greetingIndex] ?? greetingMessages[0]!}
        />

        {/* Boton flotante moderno */}
        {!isBotActive && (
          <button
            onClick={handleToggle}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-corporate text-white shadow-lg shadow-corporate/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-corporate/40 active:scale-95"
            aria-label="Abrir asistente virtual"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-corporate/30" />
            <MessageCircle size={24} className="relative z-10" />
          </button>
        )}
      </div>

      {/* Chat */}
      {isBotActive && <FixedChat onClose={handleToggle} />}
    </>
  );
}

function FixedChat({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 md:hidden" onClick={onClose} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-0 md:inset-auto md:bottom-4 md:right-4 md:p-0">
        <div className="flex h-full w-full flex-col overflow-hidden bg-white md:h-[800px] md:w-[800px] md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl">
          <ChatInterface onClose={onClose} />
        </div>
      </div>
    </>
  );
}
