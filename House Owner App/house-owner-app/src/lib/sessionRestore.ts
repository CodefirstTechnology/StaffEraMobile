import axios, { type AxiosError } from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import {
  clearAuthTokens,
  clearPersistedUser,
  getToken,
  setToken,
} from '@/lib/tokenStorage';
import { notifySessionExpired } from '@/lib/authSession';

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(options?: {
  clearOnFailure?: boolean;
}): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getToken('refreshToken');
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const accessToken = data.data.accessToken as string;
      const newRefresh = data.data.refreshToken as string;
      await setToken('accessToken', accessToken);
      await setToken('refreshToken', newRefresh);
      return accessToken;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const shouldClear = options?.clearOnFailure !== false && (status === 401 || status === 403);
      if (shouldClear) {
        await clearAuthTokens();
        await clearPersistedUser();
        notifySessionExpired();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response;
}

export function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.status;
}

export type AxiosErrorLike = AxiosError;
