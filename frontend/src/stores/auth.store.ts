import { create } from 'zustand';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'cior_auth_token';

interface UserRole {
  id: number;
  name: string;
  displayName: string;
}

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/login`, { email, password });
      // El backend envuelve en { success, data: { accessToken, user } }
      const payload = res.data.data || res.data;
      const { accessToken, user } = payload;
      localStorage.setItem(TOKEN_KEY, accessToken);
      set({ token: accessToken, user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Error al iniciar sesión';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await axios.get(`${BACKEND_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // El backend envuelve en { success, data: { ... } }
      const user = res.data.data || res.data;
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasPermission: (code: string) => {
    const { user } = get();
    return user?.permissions?.includes(code) ?? false;
  },

  hasAnyPermission: (...codes: string[]) => {
    const { user } = get();
    if (!user?.permissions) return false;
    return codes.some((code) => user.permissions.includes(code));
  },

  clearError: () => set({ error: null }),
}));
