import { FormEvent, ChangeEvent, useState, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, Upload, FileText, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  onInputChange: (text: string) => void;
  onSubmit: (e: FormEvent) => void;
  pendingAttachment?: File | null;
  onClearAttachment?: () => void;
  onAttachClick?: () => void;
  attachInputRef?: React.RefObject<HTMLInputElement>;
  onAttachFile?: (e: ChangeEvent<HTMLInputElement>) => void;
  onConfirmAttachment?: (description: string) => void;
  isUploadingAttachment?: boolean;
}

export function ChatInput({
  inputText,
  isLoading,
  onInputChange,
  onSubmit,
  pendingAttachment,
  onClearAttachment,
  onAttachClick,
  attachInputRef,
  onAttachFile,
  onConfirmAttachment,
  isUploadingAttachment,
}: ChatInputProps) {
  const [description, setDescription] = useState('');

  // Reset description cuando se limpia el attachment pendiente
  useEffect(() => {
    if (!pendingAttachment) setDescription('');
  }, [pendingAttachment]);

  const isImage = pendingAttachment?.type.startsWith('image/');
  const sizeKB = pendingAttachment ? (pendingAttachment.size / 1024).toFixed(0) : '0';

  const handleConfirm = () => {
    if (!pendingAttachment || !onConfirmAttachment || isUploadingAttachment) return;
    onConfirmAttachment(description.trim());
  };

  return (
    <form
      onSubmit={onSubmit}
      className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center bg-gradient-to-t from-white to-transparent p-4 pb-6"
    >
      <div className="relative flex w-full max-w-xl flex-col gap-2 drop-shadow-2xl">
        {/* Panel de confirmación de upload con descripción opcional */}
        {pendingAttachment && (
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-corporate/10 text-corporate">
                {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {pendingAttachment.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {sizeKB} KB · {pendingAttachment.type || 'archivo'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClearAttachment}
                disabled={isUploadingAttachment}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                aria-label="Cancelar"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agregá una descripción (opcional)..."
              maxLength={500}
              rows={2}
              disabled={isUploadingAttachment}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-corporate focus:bg-white focus:outline-none focus:ring-1 focus:ring-corporate/40 disabled:opacity-60"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClearAttachment}
                disabled={isUploadingAttachment}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isUploadingAttachment}
                className="flex items-center gap-2 rounded-full bg-corporate px-4 py-2 text-sm font-medium text-white shadow-md shadow-corporate/30 transition-all hover:bg-corporate/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAttachment ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Subir archivo
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
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
              disabled={isLoading || !!pendingAttachment}
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
              placeholder={pendingAttachment ? 'Confirmá o cancelá el archivo arriba…' : 'Escribi tu consulta...'}
              className="flex max-h-[120px] min-h-[50px] w-full resize-none bg-transparent px-5 py-3.5 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || !!pendingAttachment}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !!pendingAttachment || !inputText.trim()}
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
