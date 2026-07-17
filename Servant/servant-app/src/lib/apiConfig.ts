import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

const DEFAULT_LOCAL = 'http://localhost:5000/api/v1';
const API_PATH = '/api/v1';

/** Metro / Expo Go host (e.g. 192.168.1.34:8082) — same PC as the dev backend. */
function getMetroLanHost(): string | null {
  const hostUri =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

/** Resolved at runtime. In Expo Go dev, follows Metro LAN IP so stale .env IPs do not break the phone. */
export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return DEFAULT_LOCAL;
  }

  if (__DEV__) {
    const metroHost = getMetroLanHost();
    if (metroHost) {
      return `http://${metroHost}:5000${API_PATH}`;
    }
  }

  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    DEFAULT_LOCAL
  );
}

export const API_BASE_URL = getApiBaseUrl();
