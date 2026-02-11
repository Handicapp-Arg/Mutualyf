import { Bot, UploadCloud, Clock, Phone, Terminal } from 'lucide-react';

import { Button } from '@/components/ui';

/**
 * Hub central del Bot Nexus
 * Panel de interacción principal
 */
export function BotHub() {
  return (
    <div className="animate-in zoom-in-95 fade-in slide-in-from-bottom-20 absolute bottom-28 right-0 w-[380px] overflow-hidden rounded-[3rem] border border-slate-100 bg-white p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] duration-500">
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
            Soy el sistema de gestión inteligente de CIOR. Sube tu órden y mi
            IA la procesará para que tu visita sea 100% fluida.
          </p>
        </div>

        {/* Área de Carga */}
        <div className="group/upload relative">
          <div className="absolute inset-0 rounded-3xl bg-blue-600/5 transition-colors group-hover/upload:bg-blue-600/10" />
          <button className="relative z-10 flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 transition-all hover:border-corporate">
            <div className="rounded-2xl bg-white p-4 text-corporate shadow-sm transition-transform group-hover/upload:scale-110">
              <UploadCloud size={32} />
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 group-hover/upload:text-corporate">
              SUBIR ÓRDEN MÉDICA
            </span>
          </button>
        </div>

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
            <span className="text-[9px] font-black text-slate-500">
              HORARIOS
            </span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 p-4 transition-all hover:border-corporate hover:bg-blue-50">
            <Phone size={18} className="text-corporate" />
            <span className="text-[9px] font-black text-slate-500">
              LLAMAR
            </span>
          </button>
        </div>

        {/* CTA Principal */}
        <Button className="w-full shadow-xl shadow-blue-200" size="lg">
          INICIAR TRÁMITE DIGITAL <Terminal size={16} />
        </Button>
      </div>
    </div>
  );
}
