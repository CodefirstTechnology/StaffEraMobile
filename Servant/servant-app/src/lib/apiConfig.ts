import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

const DEFAULT_LOCAL = 'http://localhost:5000/api/v1';

/** Resolved at Metro start from .env → app.config.js extra (reliable on device). */
export function getApiBaseUrl(): string {
  // Expo web runs in the desktop browser — localhost reaches the dev backend on the same PC.
  if (Platform.OS === 'web') {
    return DEFAULT_LOCAL;
  }

  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    DEFAULT_LOCAL
  );
}

export const API_BASE_URL = getApiBaseUrl();
