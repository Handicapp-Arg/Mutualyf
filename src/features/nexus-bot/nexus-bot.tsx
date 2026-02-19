import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { BotFace } from './bot-face';
import { BotGreeting } from './bot-greeting';
import { BotHub } from './bot-hub';

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
        <BotGreeting show={showGreeting && !isBotActive} message={greetingMessages[greetingIndex] || greetingMessages[0]} />

        {/* Botón Flotante y overlays: solo visible cuando el bot está cerrado */}
        {!isBotActive && (
          <>
            <div className="group relative">
              {/* Anillos de energía solo cuando está activo */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500',
                  'scale-125 bg-cyan-400/10 opacity-0 blur-xl opacity-0'
                )}
              />
              <button
                onClick={handleToggle}
                className={cn(
                  'relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-700 sm:h-32 sm:w-32',
                  'group scale-110 bg-transparent sm:scale-125'
                )}
                aria-label={'Abrir Nexus Bot'}
              >
                {/* El BotFace solo visible cuando el bot está cerrado */}
                <div className="absolute -inset-4">
                  <BotFace />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
      {/* Hub de Nexus: fuera del stacking context del bot flotante */}
      {isBotActive && <BotHub onClose={handleToggle} />}
    </>
  );
}
