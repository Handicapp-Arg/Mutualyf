import { memo } from 'react';
import { FileText, Download } from 'lucide-react';
import { AnalyzingOrderLoader } from './analyzing-order-loader';
import type { ChatMessage, ChatAttachment } from '@/types';
import { BACKEND_URL } from '@/lib/constants';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  uploadProgress: number;
  isLoading: boolean;
  onOptionClick: (value: string, label: string) => void;
  cleanMarkdown: (text: string) => string;
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const url = `${BACKEND_URL}/conversations/attachment/${attachment.id}`;
  const isImage = attachment.fileType.startsWith('image/');
  const sizeLabel =
    attachment.fileSize >= 1024 * 1024
      ? `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(attachment.fileSize / 1024).toFixed(0)} KB`;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={attachment.fileName}
          className="mt-2 max-h-48 rounded-xl object-cover"
          loading="lazy"
        />
        <span className="mt-1 block text-[10px] opacity-60">{attachment.fileName}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 transition-colors hover:bg-black/10"
    >
      <FileText size={18} className="shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{attachment.fileName}</p>
        <p className="text-[10px] opacity-60">{sizeLabel}</p>
      </div>
      <Download size={14} className="shrink-0 opacity-40" />
    </a>
  );
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  uploadProgress,
  isLoading,
  onOptionClick,
  cleanMarkdown,
}: ChatMessageBubbleProps) {
  return (
    <div
      className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`flex max-w-[85%] flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
      >
        <div
          className={`px-5 py-3.5 shadow-sm ${
            message.role === 'user'
              ? 'rounded-[20px] rounded-tr-sm bg-gradient-to-br from-corporate to-corporate/80 text-white'
              : 'rounded-[20px] rounded-tl-sm bg-white text-slate-700'
          }`}
        >
          {message.content.startsWith('__ANALYZING_ORDER__') ? (
            <AnalyzingOrderLoader progress={uploadProgress} />
          ) : (
            <>
              {message.content && (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {cleanMarkdown(message.content)}
                </p>
              )}
              {message.attachment && (
                <AttachmentPreview attachment={message.attachment} />
              )}
            </>
          )}
        </div>

        {message.options && message.options.length > 0 && (
          <div className="mt-3 flex w-full max-w-full flex-col gap-2">
            {message.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onOptionClick(option.value, option.label)}
                disabled={isLoading}
                className="group flex w-full items-center justify-between rounded-2xl border border-corporate/10 bg-white px-5 py-3 text-left shadow-sm transition-all hover:border-corporate/30 hover:bg-corporate/5 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm font-medium text-slate-600 group-hover:text-corporate">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}

        <span
          className={`mt-1 px-1 text-[10px] ${message.role === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-400'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
});
