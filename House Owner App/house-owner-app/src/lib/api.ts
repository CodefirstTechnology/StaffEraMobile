import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import { getToken } from '@/lib/tokenStorage';
import { refreshAccessToken } from '@/lib/sessionRestore';
import { isAuthRoute } from '@/lib/authHydrate';

const API_BASE = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthRoute(original.url ?? '')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const accessToken = await refreshAccessToken({ clearOnFailure: true });
    if (!accessToken) return Promise.reject(error);

    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  },
);

export default api;
