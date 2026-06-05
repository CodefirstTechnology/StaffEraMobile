import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: { bookingId?: number } | null;
  createdAt: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data.notifications as AppNotification[];
    },
    refetchInterval: 15000,
  });
}
