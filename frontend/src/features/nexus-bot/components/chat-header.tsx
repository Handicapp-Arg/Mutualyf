import { X, MessageCircle } from 'lucide-react';

interface ChatHeaderProps {
  adminActive: boolean;
  onClose: () => void;
}

export function ChatHeader({ adminActive, onClose }: ChatHeaderProps) {
  return (
    <div className="relative z-10 flex-shrink-0 border-b border-corporate/20 bg-corporate p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
          <MessageCircle size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-white">
            Asistente Virtual
          </h4>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${adminActive ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'}`} />
            <span className="text-xs font-medium text-white/90">
              {adminActive ? 'Agente humano conectado' : 'En linea - IA activa'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:rotate-90 hover:scale-110 hover:bg-white/20 active:scale-95"
          aria-label="Cerrar chat"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
