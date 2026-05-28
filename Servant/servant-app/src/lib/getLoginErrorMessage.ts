import axios from 'axios';
import { getApiBaseUrl } from '@/lib/apiConfig';

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const base = getApiBaseUrl();
      if (base.includes('localhost') || base.includes('127.0.0.1')) {
        return (
          'Cannot reach the server. On a real phone, set EXPO_PUBLIC_API_BASE_URL in .env to your PC IP ' +
          '(run ipconfig), then restart: npx expo start -c'
        );
      }
      return (
        `Cannot reach ${base}\n\n` +
        '• Backend running? (npm start in Backend)\n' +
        '• Phone on same Wi‑Fi as PC (not mobile data)\n' +
        '• Windows Firewall: allow Node/port 5000\n' +
        '• Restart app after .env change: npx expo start -c'
      );
    }
  }

  const err = error as { response?: { data?: { message?: string } }; message?: string };
  if (err.response?.data?.message) return err.response.data.message;
  if (err.message) return err.message;

  return 'Invalid email or password. Use the email and password your agent set when onboarding you.';
}
