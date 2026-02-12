import { useState } from 'react';
import { Bot, Clock, Phone, Terminal, MessageCircle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui';
import { ChatInterface } from './chat-interface';

/**
 * Hub central del Bot Nexus
 * Panel de interacción principal con chat IA integrado
 */
export function BotHub() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="animate-in zoom-in-95 fade-in slide-in-from-bottom-20 absolute bottom-28 right-0 w-[380px] overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] duration-500">
      {showChat ? (
        <div className="flex h-[500px] flex-col">
          <div className="border-b border-slate-100 p-4">
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
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-corporate text-white">
              <Bot size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black tracking-tight text-slate-800">
                Nexus Assistant
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Sistema Activo
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Descripción */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
              <p className="text-xs font-bold leading-relaxed text-slate-500">
                Soy el asistente inteligente de CIOR. Puedo ayudarte con información sobre
                servicios, horarios, y gestión de órdenes médicas.
              </p>
            </div>

            {/* Chat IA - Botón Principal */}
            <button
              onClick={() => setShowChat(true)}
              className="group/chat relative w-full"
            >
              <div className="absolute inset-0 rounded-3xl bg-corporate/5 transition-colors group-hover/chat:bg-corporate/10" />
              <div className="relative z-10 flex h-32 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-corporate transition-all hover:shadow-lg">
                <div className="rounded-2xl bg-corporate p-4 text-white shadow-sm transition-transform group-hover/chat:scale-110">
                  <MessageCircle size={32} />
                </div>
                <span className="text-sm font-black tracking-wide text-corporate">
                  INICIAR CHAT CON IA
                </span>
              </div>
            </button>

            {/* Separador */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                Opciones Rápidas
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Botones Rápidos */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 p-4 transition-all hover:border-corporate hover:bg-blue-50">
                <Clock size={18} className="text-corporate" />
                <span className="text-[9px] font-black text-slate-500">HORARIOS</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 p-4 transition-all hover:border-corporate hover:bg-blue-50">
                <Phone size={18} className="text-corporate" />
                <span className="text-[9px] font-black text-slate-500">LLAMAR</span>
              </button>
            </div>

            {/* CTA Principal */}
            <Button className="w-full shadow-xl shadow-blue-200" size="lg">
              INICIAR TRÁMITE DIGITAL <Terminal size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
