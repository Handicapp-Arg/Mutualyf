export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, '');
