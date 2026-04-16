import { FormEvent, ChangeEvent } from 'react';
import { Send, Loader2, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  onInputChange: (text: string) => void;
  onSubmit: (e: FormEvent) => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  pendingAttachment?: File | null;
  onClearAttachment?: () => void;
  onAttachClick?: () => void;
  attachInputRef?: React.RefObject<HTMLInputElement>;
  onAttachFile?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function ChatInput({
  inputText,
  isLoading,
  onInputChange,
  onSubmit,
  onFileUpload,
  fileInputRef,
  pendingAttachment,
  onClearAttachment,
  onAttachClick,
  attachInputRef,
  onAttachFile,
}: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center bg-gradient-to-t from-white to-transparent p-4 pb-6"
    >
      <div className="relative flex w-full max-w-xl flex-col gap-2 drop-shadow-2xl">
        {/* Preview de archivo adjunto pendiente */}
        {pendingAttachment && (
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-lg ring-1 ring-black/5">
            <Paperclip size={14} className="shrink-0 text-corporate" />
            <span className="flex-1 truncate text-xs text-slate-600">
              {pendingAttachment.name}
            </span>
            <span className="text-[10px] text-slate-400">
              {(pendingAttachment.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={onClearAttachment}
              className="ml-1 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Input oculto para órdenes médicas (flujo existente) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept="image/*,.pdf"
            className="hidden"
          />

          {/* Input oculto para attachments del chat */}
          {attachInputRef && (
            <input
              type="file"
              ref={attachInputRef}
              onChange={onAttachFile}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
            />
          )}

          {/* Botón clip para adjuntar */}
          {onAttachClick && (
            <button
              type="button"
              onClick={onAttachClick}
              disabled={isLoading}
              className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-corporate disabled:opacity-40"
            >
              <Paperclip size={20} />
            </button>
          )}

          <div className="relative flex-1 rounded-[24px] bg-white shadow-xl ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-corporate/40">
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
              placeholder="Escribi tu consulta..."
              className="flex max-h-[120px] min-h-[50px] w-full resize-none bg-transparent px-5 py-3.5 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !pendingAttachment)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-corporate text-white shadow-lg shadow-corporate/30 transition-all hover:scale-105 hover:bg-corporate/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
