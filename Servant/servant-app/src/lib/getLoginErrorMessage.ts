import axios from 'axios';
import i18n from '@/lib/i18n';
import { getApiBaseUrl } from '@/lib/apiConfig';

const matches = (value: string, patterns: string[]) =>
  patterns.some((pattern) => value.includes(pattern));

/** English-only login error copy (matches House Owner app). */
export function te(key: string): string {
  return i18n.t(key, { lng: 'en' });
}

export function normalizeLoginErrorMessage(raw?: string | null): string {
  const msg = raw?.trim() ?? '';
  if (!msg) return te('auth.tryAgain');

  const lower = msg.toLowerCase();

  if (
    matches(lower, [
      'account is inactive',
      'please contact the administrator',
      'application is under review',
      'user not found or inactive',
    ])
  ) {
    return te('auth.accountInactive');
  }

  if (
    matches(lower, [
      'invalid credentials',
      'email or password',
      'username or password',
      'unauthorized',
      'login failed',
    ])
  ) {
    return te('auth.invalidCredentials');
  }

  if (
    matches(lower, [
      'email and password are required',
      'username and password are required',
    ])
  ) {
    return te('validation.credentialsRequired');
  }

  return msg.endsWith('.') ? msg : `${msg}.`;
}

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return normalizeLoginErrorMessage(String(error.response.data.message));
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const base = getApiBaseUrl();
      if (base.includes('localhost') || base.includes('127.0.0.1')) {
        return i18n.t('auth.networkLocalhost');
      }
      return i18n.t('auth.networkGeneric', { base });
    }
  }

  const err = error as { response?: { data?: { message?: string } }; message?: string };
  if (err.response?.data?.message) {
    return normalizeLoginErrorMessage(err.response.data.message);
  }
  if (err.message) return err.message;

  return te('auth.invalidCredentials');
}
