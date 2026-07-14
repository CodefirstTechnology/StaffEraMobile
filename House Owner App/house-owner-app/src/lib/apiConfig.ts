import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

const DEFAULT_LOCAL = 'http://localhost:5000/api/v1';

export function getApiBaseUrl(): string {
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
