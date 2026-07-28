import axios from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import { getToken } from '@/lib/tokenStorage';
import { refreshAccessToken, isAuthError } from '@/lib/sessionRestore';

export function isAuthRoute(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register-owner') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout')
  );
}

async function fetchCurrentUser(accessToken: string) {
  const { data } = await axios.get(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.data.user;
}

/** Validates or restores the session; returns user or null only when tokens are invalid. */
export async function restoreAuthenticatedUser<T>() {
  let accessToken = await getToken('accessToken');
  const refreshToken = await getToken('refreshToken');

  if (!accessToken && !refreshToken) return null;

  if (!accessToken && refreshToken) {
    accessToken = await refreshAccessToken({ clearOnFailure: true });
    if (!accessToken) return null;
  }

  try {
    return (await fetchCurrentUser(accessToken!)) as T;
  } catch (error) {
    if (!isAuthError(error)) throw error;
    const refreshed = await refreshAccessToken({ clearOnFailure: true });
    if (!refreshed) return null;
    return (await fetchCurrentUser(refreshed)) as T;
  }
}
