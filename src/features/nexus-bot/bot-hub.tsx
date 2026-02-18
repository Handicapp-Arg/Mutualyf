import { ChatInterface } from './chat-interface';

interface BotHubProps {
  onClose: () => void;
}

/**
 * Hub central del Bot Nexus
 * Panel de interacción principal con chat IA integrado
 */
export function BotHub({ onClose }: BotHubProps) {
  return (
    <div className="animate-in zoom-in-95 fade-in slide-in-from-bottom-20 absolute bottom-6 right-6 flex h-[600px] max-h-[calc(100vh-3rem)] w-[420px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_-10px_rgba(0,0,0,0.35)] duration-300">
      <ChatInterface onClose={onClose} />
    </div>
  );
}
