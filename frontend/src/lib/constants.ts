export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, '');

export const PRESENCE_ONLINE_WINDOW_MS = 60_000;

export const isOnline = (lastSeen: string | Date): boolean => {
  const ts = typeof lastSeen === 'string' ? new Date(lastSeen).getTime() : lastSeen.getTime();
  return Date.now() - ts < PRESENCE_ONLINE_WINDOW_MS;
};
