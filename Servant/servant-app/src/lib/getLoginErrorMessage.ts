import axios from 'axios';

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const base = process.env.EXPO_PUBLIC_API_BASE_URL || '';
      if (base.includes('localhost') || base.includes('127.0.0.1')) {
        return (
          'Cannot reach the server. On a real phone, change .env to your computer IP, e.g. ' +
          'EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:5000/api/v1 then restart Expo (npx expo start -c).'
        );
      }
      return 'Cannot reach the server. Check that the backend is running and your phone is on the same Wi‑Fi.';
    }
  }

  const err = error as { response?: { data?: { message?: string } }; message?: string };
  if (err.response?.data?.message) return err.response.data.message;
  if (err.message) return err.message;

  return 'Invalid email or password. Use the email and password your agent set when onboarding you.';
}
