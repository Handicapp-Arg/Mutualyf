import { memo } from 'react';
import { AnalyzingOrderLoader } from './analyzing-order-loader';
import type { ChatMessage } from '@/types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  uploadProgress: number;
  isLoading: boolean;
  onOptionClick: (value: string, label: string) => void;
  cleanMarkdown: (text: string) => string;
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
              ? 'rounded-[20px] rounded-tr-sm bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
              : 'rounded-[20px] rounded-tl-sm bg-white text-slate-700'
          }`}
        >
          {message.content.startsWith('__ANALYZING_ORDER__') ? (
            <AnalyzingOrderLoader progress={uploadProgress} />
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {cleanMarkdown(message.content)}
            </p>
          )}
        </div>

        {message.options && message.options.length > 0 && (
          <div className="mt-3 flex w-full max-w-full flex-col gap-2">
            {message.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onOptionClick(option.value, option.label)}
                disabled={isLoading}
                className="group flex w-full items-center justify-between rounded-2xl border border-cyan-100 bg-white px-5 py-3 text-left shadow-sm transition-all hover:border-cyan-300 hover:bg-cyan-50/50 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm font-medium text-slate-600 group-hover:text-cyan-700">
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
