import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

import { BotFace } from './bot-face';
import { BotGreeting } from './bot-greeting';
import { ChatInterface } from './chat-interface';

/**
 * Nexus Bot 2.0 - Asistente Virtual CIOR
 * Bot flotante con inteligencia artificial para gestión de órdenes
 */

export function NexusBot() {
  const [isBotActive, setIsBotActive] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);

  // Mensajes intercalados para el globo
  const greetingMessages = [
    '¡Hola! Soy Nexus. Carga tu orden aquí para agilizar tu atención y evitar esperas.',
    'Estoy aquí para ayudarte, ¿qué necesitas?',
    '¿Tienes alguna consulta? ¡Estoy para ayudarte!',
    '¿Necesitás ayuda con algo específico?',
    'No dudes en preguntarme lo que quieras.',
  ];

  useEffect(() => {
    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;
    let cycleTimeout: NodeJS.Timeout;

    // Inicia el ciclo después de 2 segundos
    showTimeout = setTimeout(() => {
      setShowGreeting(true);
      // Oculta el globo después de 15s
      hideTimeout = setTimeout(() => {
        setShowGreeting(false);
        // Cambia el mensaje y vuelve a mostrar después de 15s
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
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 sm:bottom-12 sm:right-12">
        {/* Burbuja de Saludo */}
        <BotGreeting
          show={showGreeting && !isBotActive}
          message={greetingMessages[greetingIndex] ?? greetingMessages[0]!}
        />

        {/* Botón Flotante y overlays: solo visible cuando el bot está cerrado */}
        {!isBotActive && (
          <>
            <div className="group relative">
              <button
                onClick={handleToggle}
                className={cn(
                  'relative flex h-24 w-24 items-center justify-center rounded-full bg-transparent sm:h-40 sm:w-40',
                  'transition-all duration-300 hover:scale-105 active:scale-95'
                )}
                aria-label={'Abrir Nexus Bot'}
              >
                {/* El BotFace solo visible cuando el bot está cerrado */}
                <div className="absolute -inset-6 transition-transform duration-300 group-hover:-translate-y-1">
                  <BotFace />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
      {/* Chat fijo - pantalla completa en móvil, flotante en desktop */}
      {isBotActive && <FixedChat onClose={handleToggle} />}
    </>
  );
}

// Componente de chat fijo (pantalla completa en móvil, flotante en desktop)
function FixedChat({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Overlay en móvil */}
      <div className="fixed inset-0 z-[200] bg-black/50 md:hidden" onClick={onClose} />

      {/* Chat */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-0 md:inset-auto md:bottom-4 md:right-4 md:p-0">
  <div className="flex h-full w-full flex-col overflow-hidden bg-white md:h-[800px] md:w-[800px] md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl">
          <ChatInterface onClose={onClose} />
        </div>
      </div>
    </>
  );
}
