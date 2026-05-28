import { create } from 'zustand';
import api from '@/lib/api';
import { clearAuthTokens, getToken, setToken } from '@/lib/tokenStorage';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  servant?: { id: number; verificationStatus: string };
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const token = await getToken('accessToken');
      if (!token) return set({ isLoading: false });
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      await clearAuthTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    if (data.data.user.role !== 'SERVANT') {
      throw {
        response: {
          data: {
            message: 'This account is not a servant. Use the House Owner or Agent app.',
          },
        },
      };
    }
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    await clearAuthTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
