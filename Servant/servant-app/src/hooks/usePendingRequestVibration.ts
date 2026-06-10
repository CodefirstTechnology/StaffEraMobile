import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  stopPendingRequestVibration,
  syncPendingRequestVibration,
} from '@/lib/bookingRequestVibration';

type BookingRow = { id: number; status: string };

/** Repeat vibration while open or direct pending booking requests need a response. */
export function usePendingRequestVibration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: openRequests = [] } = useQuery({
    queryKey: ['open-requests'],
    queryFn: async () => {
      const res = await api.get('/bookings/open-requests');
      return res.data.data.requests as BookingRow[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 8000 : false,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as BookingRow[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 8000 : false,
  });

  const pendingDirect = bookings.filter((b) => b.status === 'PENDING').length;
  const hasPendingRequests = openRequests.length > 0 || pendingDirect > 0;

  useEffect(() => {
    syncPendingRequestVibration(hasPendingRequests);
    return () => stopPendingRequestVibration();
  }, [hasPendingRequests]);
}
