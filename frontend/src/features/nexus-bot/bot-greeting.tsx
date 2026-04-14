export interface BotGreetingProps {
  show: boolean;
  message: string;
}

/**
 * Burbuja de saludo del bot
 */
export function BotGreeting(props: BotGreetingProps) {
  const { show, message } = props;
  if (!show) return null;
  return (
    <div className="animate-in fade-in slide-in-from-right-5 duration-500">
      <div className="relative mb-2 max-w-[240px] rounded-[2rem] border border-corporate/10 bg-white px-6 py-4 shadow-lg sm:shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-corporate" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-corporate">
            ASISTENTE ONLINE
          </span>
        </div>
        <p className="text-xs font-bold leading-tight text-slate-600">{message}</p>
        {/* Flecha del globo */}
        <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-corporate/10 bg-white" />
      </div>
    </div>
  );
}
