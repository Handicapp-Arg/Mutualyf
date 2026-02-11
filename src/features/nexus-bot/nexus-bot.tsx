import { useState, useEffect } from 'react';
import { X, Bot, UploadCloud, Clock, Phone, Terminal } from 'lucide-react';

import { Button } from '@/components/ui';
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
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      {/* Burbuja de Saludo */}
      <BotGreeting show={showGreeting && !isBotActive} />

      {/* Botón Flotante */}
      <div className="relative">
        {/* Anillos de pulso concéntricos */}
        <div className="absolute inset-0 animate-[pulse-ring_2s_infinite] rounded-full bg-corporate/20" />
        <div className="absolute inset-0 animate-[pulse-ring_3s_infinite_500ms] rounded-full bg-corporate/10" />

        <button
          onClick={handleToggle}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-700',
            'animate-[bot-glow_3s_infinite]',
            isBotActive
              ? 'rotate-90 bg-slate-900'
              : 'bg-corporate group'
          )}
          aria-label={isBotActive ? 'Cerrar Nexus Bot' : 'Abrir Nexus Bot'}
        >
          {isBotActive ? (
            <X size={32} className="text-white" />
          ) : (
            <BotFace />
          )}
        </button>
      </div>

      {/* Hub de Nexus */}
      {isBotActive && <BotHub />}
    </div>
  );
}
