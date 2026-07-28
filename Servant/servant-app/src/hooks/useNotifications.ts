import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: { bookingId?: number } | null;
  createdAt: string;
};

export function useNotifications(page = 1, limit = 10) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { page, limit } });
      return {
        notifications: res.data.data.notifications as AppNotification[],
        total: (res.data.data.pagination?.total ?? res.data.data.notifications.length) as number,
      };
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });
}
