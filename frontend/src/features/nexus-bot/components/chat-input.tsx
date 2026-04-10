import { FormEvent, ChangeEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  onInputChange: (text: string) => void;
  onSubmit: (e: FormEvent) => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ChatInput({
  inputText,
  isLoading,
  onInputChange,
  onSubmit,
  onFileUpload,
  fileInputRef,
}: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center bg-gradient-to-t from-white to-transparent p-4 pb-6"
    >
      <div className="relative flex w-full max-w-xl items-end gap-2 drop-shadow-2xl">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          accept="image/*,.pdf"
          className="hidden"
        />

        <div className="relative flex-1 rounded-[24px] bg-white shadow-xl ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-cyan-400/50">
          <textarea
            value={inputText}
            onChange={(e) => {
              onInputChange(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
            placeholder="Escribí tu consulta..."
            className="flex max-h-[120px] min-h-[50px] w-full resize-none bg-transparent px-5 py-3.5 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
            disabled={isLoading}
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} className="ml-0.5" />
          )}
        </button>
      </div>
    </form>
  );
}
