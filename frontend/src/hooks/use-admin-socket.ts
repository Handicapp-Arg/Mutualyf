import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface AdminSocketHandlers {
  onConversationUpserted?: (conversation: any) => void;
  onLiveSessions?: (sessions: any[]) => void;
}

/**
 * Hook que mantiene una conexión Socket.IO con el backend para recibir
 * actualizaciones en tiempo real del panel admin.
 *
 * Eventos escuchados:
 *  - `conversation.upserted` → cada vez que una conversación se crea/actualiza
 *  - `session.live`          → snapshot del array de sesiones en vivo
 *
 * El socket se conecta una sola vez por mount y se desconecta en cleanup.
 * Los handlers se almacenan en un ref para poder mutarlos sin reconectar.
 */
export function useAdminSocket(handlers: AdminSocketHandlers): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Mantener handlers actualizados sin reconectar el socket
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    // Quitar el sufijo /api porque socket.io conecta al root del servidor
    const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, '');

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Admin socket conectado:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Admin socket desconectado:', reason);
    });

    socket.on('conversation.upserted', (conversation: any) => {
      handlersRef.current.onConversationUpserted?.(conversation);
    });

    socket.on('session.live', (sessions: any[]) => {
      handlersRef.current.onLiveSessions?.(sessions);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}
