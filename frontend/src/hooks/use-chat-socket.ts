import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { ChatMessage } from '@/types';
import { BACKEND_URL, SOCKET_URL } from '@/lib/constants';

interface UseChatSocketOptions {
  sessionId: string;
  userName: string;
}

const PRESENCE_PING_MS = 20_000;

/**
 * Encapsula socket.io del chat:
 *  - Presencia por WebSocket: handshake registra online, `presence.ping` cada 20s,
 *    disconnect marca offline automáticamente (sin HTTP heartbeat).
 *  - Escucha `admin.takeover` y `admin.message`.
 *  - Al cerrar la pestaña, avisa `sendBeacon` a /sessions/end como seguro adicional.
 */
export function useChatSocket({ sessionId, userName }: UseChatSocketOptions) {
  const [adminActive, setAdminActive] = useState(false);
  const [adminMessages, setAdminMessages] = useState<ChatMessage[]>([]);
  const adminActiveRef = useRef(false);
  const userNameRef = useRef(userName);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    adminActiveRef.current = adminActive;
  }, [adminActive]);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { sessionId },
    });

    const pingId = setInterval(() => {
      socket.emit('presence.ping');
    }, PRESENCE_PING_MS);

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

    socket.on('admin.takeover', (data: { sessionId: string; active: boolean }) => {
      if (data.sessionId !== sessionId) return;
      setAdminActive(data.active);
      adminActiveRef.current = data.active;

      setAdminMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.active
            ? 'Un agente humano se ha conectado a la conversación. A partir de ahora te asistirá directamente.'
            : 'El agente humano ha dejado la conversación. Soy MutuaBot nuevamente, tu asistente virtual. ¿En qué puedo ayudarte?',
          timestamp: new Date(),
        },
      ]);
    });

    socket.on(
      'admin.message',
      (data: { sessionId: string; message: { role: string; content: string; timestamp: string; attachment?: any } }) => {
        if (data.sessionId !== sessionId) return;
        setAdminMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message.content,
            timestamp: new Date(data.message.timestamp),
            ...(data.message.attachment ? { attachment: data.message.attachment } : {}),
          },
        ]);
      },
    );

    return () => {
      clearInterval(pingId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
