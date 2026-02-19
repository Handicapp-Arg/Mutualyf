import React, { useRef, useState, useEffect } from 'react';
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
  <BotGreeting show={showGreeting && !isBotActive} message={(greetingIndex >= 0 && greetingIndex < greetingMessages.length) ? greetingMessages[greetingIndex] : greetingMessages[0]} />

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
      {/* Chat movible directamente, sin BotHub */}
      {isBotActive && <MovableChat onClose={handleToggle} />}
    </>
  );
}

// Componente que hace movible el chat directamente
function MovableChat({ onClose }: { onClose: () => void }) {
  // Tamaño responsivo: nunca mayor al 95vw/90vh, mínimo 340x400
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const CHAT_WIDTH = Math.max(340, Math.min(640, Math.floor(vw * 0.48)));
  const CHAT_HEIGHT = Math.max(400, Math.min(600, Math.floor(vh * 0.7)));
  const [position, setPosition] = useState({ x: vw - CHAT_WIDTH - 32, y: vh - CHAT_HEIGHT - 32 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touchEvent = e as React.TouchEvent<HTMLDivElement>;
      if (touchEvent.touches && touchEvent.touches.length > 0 && touchEvent.touches[0]) {
        clientX = touchEvent.touches[0].clientX;
        clientY = touchEvent.touches[0].clientY;
      } else {
        clientX = position.x;
        clientY = position.y;
      }
    } else {
      clientX = (e as React.MouseEvent<HTMLDivElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLDivElement>).clientY;
    }
    dragOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging) return;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches && touchEvent.touches.length > 0 && touchEvent.touches[0]) {
        clientX = touchEvent.touches[0].clientX;
        clientY = touchEvent.touches[0].clientY;
      } else {
        return;
      }
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return;
    }
    let newX = clientX - dragOffset.current.x;
    let newY = clientY - dragOffset.current.y;
    newX = Math.max(0, Math.min(vw - CHAT_WIDTH, newX));
    newY = Math.max(0, Math.min(vh - CHAT_HEIGHT, newY));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div
      className="z-[200] fixed flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_-10px_rgba(0,0,0,0.35)]"
      style={{
        left: position.x,
        top: position.y,
        bottom: 'auto',
        right: 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        width: CHAT_WIDTH,
        height: CHAT_HEIGHT,
        maxWidth: '95vw',
        maxHeight: '90vh',
        minWidth: 340,
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <div className="flex-1 min-h-0 w-full h-full">
        <ChatInterface onClose={onClose} />
      </div>
    </div>
  );
}
