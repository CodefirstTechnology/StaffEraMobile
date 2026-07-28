import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';
const AUTH_USER_KEY = 'authUser';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function secureStoreAvailable(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readSecure(key: string): Promise<string | null> {
  if (!(await secureStoreAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(key, secureStoreOptions);
  } catch {
    return null;
  }
}

async function writeSecure(key: string, value: string): Promise<void> {
  if (!(await secureStoreAvailable())) return;
  try {
    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  } catch {
    /* retry once — SecureStore can be briefly unavailable on cold start */
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOptions);
    } catch {
      /* ignore */
    }
  }
}

async function deleteSecure(key: string): Promise<void> {
  if (!(await secureStoreAvailable())) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export async function getToken(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return readSecure(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await writeSecure(key, value);
}

export async function removeToken(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await deleteSecure(key);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([removeToken('accessToken'), removeToken('refreshToken')]);
}

export async function persistUser(user: unknown): Promise<void> {
  await setToken(AUTH_USER_KEY, JSON.stringify(user));
}

export async function loadPersistedUser<T>(): Promise<T | null> {
  const raw = await getToken(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearPersistedUser(): Promise<void> {
  await removeToken(AUTH_USER_KEY);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([clearAuthTokens(), clearPersistedUser()]);
}
