import React, { useRef, useState } from 'react';
import { ChatInterface } from './chat-interface';

interface BotHubProps {
  onClose: () => void;
}

/**
 * Hub central del Bot Nexus
 * Panel de interacción principal con chat IA integrado
 * Ahora es movible (draggable)
 */
export function BotHub({ onClose }: BotHubProps) {
  // Tamaño grande para media pantalla
  // Tamaño responsivo: nunca mayor al 95vw/90vh, mínimo 340x400
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const CHAT_WIDTH = Math.max(340, Math.min(640, Math.floor(vw * 0.48)));
  const CHAT_HEIGHT = Math.max(400, Math.min(600, Math.floor(vh * 0.7)));
  const [position, setPosition] = useState({ x: vw - CHAT_WIDTH - 32, y: vh - CHAT_HEIGHT - 32 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Actualiza la posición al arrastrar
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = position.x;
        clientY = position.y;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
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
    if ('touches' in e && e.touches && e.touches.length > 0 && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return;
    }
    let newX = clientX - dragOffset.current.x;
    let newY = clientY - dragOffset.current.y;
    // Limitar dentro de la ventana
  newX = Math.max(0, Math.min(vw - CHAT_WIDTH, newX));
  newY = Math.max(0, Math.min(vh - CHAT_HEIGHT, newY));
  setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };

  // Suscribirse/desuscribirse a eventos globales
  React.useEffect(() => {
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
      className="z-[200] fixed flex flex-col w-full h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_-10px_rgba(0,0,0,0.35)]"
      style={{
        left: position.x,
        top: position.y,
        bottom: 'auto',
        right: 'auto',
        cursor: dragging ? 'grabbing' : 'default',
        width: CHAT_WIDTH,
        height: CHAT_HEIGHT,
        maxWidth: '95vw',
        maxHeight: '90vh',
        minWidth: 340,
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Barra superior para arrastrar */}
      <div
        className="w-full h-8 cursor-grab active:cursor-grabbing bg-gradient-to-r from-corporate/10 to-corporate/5 border-b border-slate-200 flex items-center px-3 select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ userSelect: 'none' }}
      >
        <span className="text-xs text-slate-500">Mover chat</span>
      </div>
      <div className="flex-1 min-h-0 w-full h-full">
        <ChatInterface onClose={onClose} />
      </div>
    </div>
  );
}
