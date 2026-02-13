import { useState } from 'react';
import { Bot, MessageCircle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui';
import { ChatInterface } from './chat-interface';

/**
 * Hub central del Bot Nexus
 * Panel de interacción principal con chat IA integrado
 */
export function BotHub() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="animate-in zoom-in-95 fade-in slide-in-from-bottom-20 absolute bottom-20 right-0 max-h-[calc(100vh-9rem)] w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] duration-500 sm:bottom-28 sm:max-h-[calc(100vh-10rem)] sm:rounded-[3rem]">
      {showChat ? (
        <div className="flex h-full max-h-[500px] min-h-[400px] flex-col">
          <div className="flex-shrink-0 border-b border-slate-100 p-4">
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-corporate"
            >
              <ArrowLeft size={16} />
              Volver al menú
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4 md:mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate text-white sm:h-12 sm:w-12">
              <Bot size={20} className="sm:h-6 sm:w-6" />
            </div>
            <div>
              <h4 className="text-base font-black tracking-tight text-slate-800 sm:text-lg">
                Nexus Assistant
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
                  Sistema Activo
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Descripción */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:rounded-3xl sm:p-4 md:p-6">
              <p className="text-[10px] font-bold leading-relaxed text-slate-500 sm:text-xs">
                Soy el asistente inteligente de CIOR. Puedo ayudarte con información sobre
                servicios, horarios, y gestión de órdenes médicas.
              </p>
            </div>

            {/* Chat IA - Botón Principal */}
            <button
              onClick={() => setShowChat(true)}
              className="group/chat relative w-full"
            >
              <div className="absolute inset-0 rounded-2xl bg-corporate/5 transition-colors group-hover/chat:bg-corporate/10 sm:rounded-3xl" />
              <div className="relative z-10 flex h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-corporate transition-all hover:shadow-lg sm:h-28 sm:gap-3 sm:rounded-3xl md:h-32">
                <div className="rounded-xl bg-corporate p-2.5 text-white shadow-sm transition-transform group-hover/chat:scale-110 sm:rounded-2xl sm:p-3 md:p-4">
                  <MessageCircle size={20} className="sm:h-6 sm:w-6 md:h-8 md:w-8" />
                </div>
                <span className="text-[10px] font-black tracking-wide text-corporate sm:text-xs md:text-sm">
                  INICIAR CHAT CON IA
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
