import React, { useState } from 'react';
import { ChatMessages, Message } from './MessageBubble';
import { responderCIOR } from './ciorBot';

export const NexusBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy el asistente virtual de CIOR Imágenes. ¿En qué puedo ayudarte hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);
    setInput('');
    setTimeout(() => {
      const botResponse = responderCIOR(input);
      setMessages((msgs) => [...msgs, { role: 'assistant', content: botResponse }]);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="flex flex-col h-[70vh] w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <ChatMessages messages={messages} />
      <div className="flex items-center p-2 border-t bg-white">
        <input
          className="flex-1 rounded-full border px-4 py-2 mr-2 focus:outline-none focus:ring"
          type="text"
          placeholder="Escribe tu mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button
          className="bg-blue-500 text-white rounded-full px-4 py-2 font-semibold disabled:opacity-50"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};
