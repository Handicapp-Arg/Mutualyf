export interface BotGreetingProps {
  show: boolean;
  message: string;
}


/**
 * Burbuja de saludo del bot Nexus
 */
export function BotGreeting(props: BotGreetingProps) {
  const { show, message } = props;
  if (!show) return null;
  return (
    <div className="animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="relative mb-4 max-w-[240px] rounded-[2rem] border border-blue-50 bg-white px-6 py-4 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-corporate">
            NEXUS ONLINE
          </span>
        </div>
        <p className="text-xs font-bold leading-tight text-slate-600">
          {message}
        </p>
        {/* Flecha del globo */}
        <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-blue-50 bg-white" />
      </div>
    </div>
  );
}
