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

  useEffect(() => {
    // El bot saluda después de 2 segundos
    const timer = setTimeout(() => setShowGreeting(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    setIsBotActive(!isBotActive);
    setShowGreeting(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 sm:bottom-12 sm:right-12">
      {/* Burbuja de Saludo */}
      <BotGreeting show={showGreeting && !isBotActive} />

      {/* Botón Flotante */}
      <div className="group relative">
        {/* Anillos de energía solo cuando está activo o hover */}
        <div
          className={cn(
            'absolute inset-0 rounded-full transition-all duration-500',
            isBotActive
              ? 'animate-[pulse-ring_2s_infinite] bg-slate-900/20'
              : 'scale-125 bg-cyan-400/10 opacity-0 blur-xl group-hover:opacity-100'
          )}
        />

        <button
          onClick={handleToggle}
          className={cn(
            'relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-700 sm:h-32 sm:w-32',
            isBotActive
              ? 'scale-100 bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-md'
              : 'group scale-110 bg-transparent hover:scale-125 sm:scale-125 sm:hover:scale-150'
          )}
          aria-label={isBotActive ? 'Cerrar Nexus Bot' : 'Abrir Nexus Bot'}
        >
          {/* El BotFace siempre visible, pero quizás cambia de expresión o fondo */}
          <div className="pointer-events-none absolute -inset-4">
            <BotFace />
          </div>

          {/* Icono de cierre superpuesto sutilmente cuando está activo */}
          <div
            className={cn(
              'absolute inset-0 z-10 flex items-center justify-center transition-all duration-500',
              isBotActive
                ? 'scale-100 opacity-100'
                : 'pointer-events-none scale-50 opacity-0'
            )}
          >
            <X
              size={32}
              className="text-white/50 drop-shadow-md transition-colors hover:text-white sm:h-10 sm:w-10"
            />
          </div>
        </button>
      </div>

      {/* Hub de Nexus */}
      {isBotActive && <BotHub onClose={handleToggle} />}
    </div>
  );
}
