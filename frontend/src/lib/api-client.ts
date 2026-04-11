import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // El backend envuelve respuestas en { success, data, ... }
    // Desenvolver automáticamente para que res.data sea el contenido real
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
