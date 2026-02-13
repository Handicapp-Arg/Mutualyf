import React, { useEffect, useRef } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  return (
    <div
      className={`mb-2 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] shadow-md text-sm whitespace-pre-line ${
          message.role === 'user'
            ? 'bg-blue-500 text-white self-end'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};

interface ChatMessagesProps {
  messages: Message[];
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4 bg-gradient-to-b from-gray-50 to-gray-200 rounded-t-xl">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
