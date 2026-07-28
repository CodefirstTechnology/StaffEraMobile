import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isAwaitingServantAccept } from '@/lib/bookingPoll';

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: {
    bookingId?: number;
    helperName?: string;
    completedAt?: string;
    timeEntryId?: number;
    workDetails?: Record<string, unknown>;
  } | null;
  createdAt: string;
};

export function useNotifications(page = 1, limit = 10) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const seenIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);

  const query = useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { page, limit } });
      return {
        notifications: res.data.data.notifications as AppNotification[],
        total: (res.data.data.pagination?.total ?? res.data.data.notifications.length) as number,
      };
    },
    enabled: isAuthenticated,
    refetchInterval: (q) => {
      if (!isAuthenticated) return false;
      const bookings = qc.getQueryData<{ status: string }[]>(['bookings']);
      if (bookings?.some(isAwaitingServantAccept)) return 2000;
      return 15000;
    },
  });

  useEffect(() => {
    const notifications = query.data?.notifications;
    if (!notifications) return;

    if (!initialized.current) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      initialized.current = true;
      return;
    }

    for (const notification of notifications) {
      if (seenIds.current.has(notification.id)) continue;
      if (
        notification.type !== 'BOOKING_CONFIRMED' &&
        notification.type !== 'BOOKING_DECLINED' &&
        notification.type !== 'BOOKING_REJECTED' &&
        notification.type !== 'WORK_COMPLETED' &&
        notification.type !== 'BOOKING_COMPLETED'
      ) {
        continue;
      }

      const bookingId = notification.data?.bookingId;
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: ['home-summary'] });
      if (bookingId != null) {
        void qc.invalidateQueries({ queryKey: ['booking', String(bookingId)] });
      }
    }

    seenIds.current = new Set(notifications.map((n) => n.id));
  }, [query.data?.notifications, qc]);

  return query;
}
