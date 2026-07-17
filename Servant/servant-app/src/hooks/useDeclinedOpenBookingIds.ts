import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useDeclinedOpenBookingIds() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['declined-open-booking-ids'],
    queryFn: async () => {
      const res = await api.get('/bookings/declined-open-ids');
      return res.data.data.bookingIds as number[];
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });
}

export function isDeclinedOpenBooking(bookingId: number, declinedIds: number[] | undefined) {
  return (declinedIds ?? []).includes(bookingId);
}
