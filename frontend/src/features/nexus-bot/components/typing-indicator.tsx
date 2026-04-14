import { MessageCircle } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-corporate/10">
          <MessageCircle size={16} className="text-corporate" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-slate-600">
            Escribiendo
          </span>
          <span className="flex gap-1">
            <span className="animate-bounce text-corporate" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce text-corporate" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce text-corporate" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
