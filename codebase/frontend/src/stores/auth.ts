import { create } from 'zustand';
import { api } from '../services/api';
import { User } from '../../../shared/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error.response?.data?.message || 'Login failed. Please verify credentials.';
      set({
        error: errMsg,
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/register', { email, name, password });
      set({
        isLoading: false,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error.response?.data?.message || 'Registration failed. Please try again.';
      set({
        error: errMsg,
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error on server, clearing client state anyway:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Axios interceptor will automatically try to refresh the token.
      // If refresh also fails, it redirects to login and clears localStorage.
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
