import { create } from 'zustand';
import api from '@/lib/api';
import { setSessionExpiredHandler } from '@/lib/authSession';
import { restoreAuthenticatedUser } from '@/lib/authHydrate';
import { isNetworkError } from '@/lib/sessionRestore';
import {
  clearAuthSession,
  getToken,
  setToken,
  persistUser,
  loadPersistedUser,
  clearPersistedUser,
} from '@/lib/tokenStorage';
import { useLanguageStore } from '@/store/languageStore';
import i18n, { isSupportedLanguage } from '@/lib/i18n';
import { te } from '@/lib/i18n/alertMessages';

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  preferredLanguage?: string;
  houseOwner?: {
    id: number;
    city?: string;
    address?: string;
    flatNo?: string;
    building?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
  };
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
};

async function applyUserSession(user: User) {
  await persistUser(user);
  if (isSupportedLanguage(user?.preferredLanguage)) {
    await useLanguageStore.getState().syncFromUser(user.preferredLanguage);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const accessToken = await getToken('accessToken');
      const refreshToken = await getToken('refreshToken');

      if (!accessToken && !refreshToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      try {
        const user = await restoreAuthenticatedUser<User>();
        if (user) {
          await applyUserSession(user);
          set({ user, isAuthenticated: true, isLoading: false });
          return;
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      } catch (error) {
        if (isNetworkError(error)) {
          const cachedUser = await loadPersistedUser<User>();
          if (cachedUser && (accessToken || refreshToken)) {
            set({ user: cachedUser, isAuthenticated: true, isLoading: false });
            return;
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      const cachedUser = await loadPersistedUser<User>();
      const refreshToken = await getToken('refreshToken');
      if (cachedUser && refreshToken) {
        set({ user: cachedUser, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    if (data.data.user.role !== 'HOUSE_OWNER') {
      throw {
        response: {
          data: {
            message: te('auth.wrongRole'),
          },
        },
      };
    }
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    const user = data.data.user as User;
    await applyUserSession(user);
    set({ user, isAuthenticated: true });
    const lang = useLanguageStore.getState().language;
    void useLanguageStore.getState().setLanguage(lang, { syncProfile: true });
  },

  register: async (payload) => {
    const body = payload as Record<string, string | number | undefined>;
    const lang = useLanguageStore.getState().language;
    const phoneDigits = String(body.phone ?? '').replace(/\D/g, '');
    const { data } = await api.post('/auth/register-owner', {
      ...body,
      email: String(body.email).trim().toLowerCase(),
      phone: phoneDigits || undefined,
      preferredLanguage: lang,
    });
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    const user = data.data.user as User;
    await applyUserSession(user);
    set({ user, isAuthenticated: true });
    void useLanguageStore.getState().setLanguage(lang, { syncProfile: true });
  },

  logout: async () => {
    try {
      const refreshToken = await getToken('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    await clearAuthSession();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    if (user) void persistUser(user);
    else void clearPersistedUser();
    set({ user, isAuthenticated: !!user });
  },
}));

setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});
