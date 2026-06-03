import { create } from 'zustand';
import api from '@/lib/api';
import { setSessionExpiredHandler } from '@/lib/authSession';
import { clearAuthTokens, getToken, setToken } from '@/lib/tokenStorage';
import { useLanguageStore } from '@/store/languageStore';
import i18n, { isSupportedLanguage } from '@/lib/i18n';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  preferredLanguage?: string;
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
      const user = data.data.user;
      set({ user, isAuthenticated: true, isLoading: false });
      if (isSupportedLanguage(user?.preferredLanguage)) {
        await useLanguageStore.getState().syncFromUser(user.preferredLanguage);
      }
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
            message: i18n.t('auth.wrongRoleServant'),
          },
        },
      };
    }
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    const user = data.data.user;
    set({ user, isAuthenticated: true });
    const lang = useLanguageStore.getState().language;
    void useLanguageStore.getState().setLanguage(lang, { syncProfile: true });
  },

  logout: async () => {
    await clearAuthTokens();
    set({ user: null, isAuthenticated: false });
  },
}));

setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});
