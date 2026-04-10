import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { ChatMessage } from '@/types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, '');

interface UseChatSocketOptions {
  sessionId: string;
  userName: string;
}

/**
 * Hook que encapsula toda la lógica de Socket.io y heartbeat del chat.
 * - Heartbeat cada 10s al backend
 * - Escucha admin.takeover y admin.message
 * - Limpia sesión al desmontar o cerrar pestaña
 */
export function useChatSocket({ sessionId, userName }: UseChatSocketOptions) {
  const [adminActive, setAdminActive] = useState(false);
  const [adminMessages, setAdminMessages] = useState<ChatMessage[]>([]);
  const adminActiveRef = useRef(false);
  const userNameRef = useRef(userName);

  // Mantener ref actualizado
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    adminActiveRef.current = adminActive;
  }, [adminActive]);

  // Heartbeat: ping cada 10s + cleanup al desmontar
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = () => {
      fetch(`${BACKEND_URL}/sessions/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userName: userNameRef.current || 'Anónimo',
        }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 10000);

    const handleBeforeUnload = () => {
      const payload = JSON.stringify({ sessionId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${BACKEND_URL}/sessions/end`,
          new Blob([payload], { type: 'application/json' }),
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      fetch(`${BACKEND_URL}/sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [sessionId]);

  // Socket.io: escuchar admin.takeover y admin.message
  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('admin.takeover', (data: { sessionId: string; active: boolean }) => {
      if (data.sessionId === sessionId) {
        setAdminActive(data.active);
        adminActiveRef.current = data.active;

        const statusMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.active
            ? 'Un agente humano se ha conectado a la conversación. A partir de ahora te asistirá directamente.'
            : 'El agente humano ha dejado la conversación. Soy Nexus nuevamente, tu asistente virtual. ¿En qué puedo ayudarte?',
          timestamp: new Date(),
        };
        setAdminMessages((prev) => [...prev, statusMessage]);
      }
    });

    socket.on('admin.message', (data: { sessionId: string; message: { role: string; content: string; timestamp: string } }) => {
      if (data.sessionId === sessionId) {
        const msg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message.content,
          timestamp: new Date(data.message.timestamp),
        };
        setAdminMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  return {
    adminActive,
    adminActiveRef,
    adminMessages,
    clearAdminMessages: () => setAdminMessages([]),
  };
}
