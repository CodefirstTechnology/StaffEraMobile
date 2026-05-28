import { useQuery } from '@tanstack/react-query';
import { fetchBookingTracking } from '@/lib/tracking';

export function useBookingTrackingPoll(bookingId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['booking-tracking', bookingId],
    queryFn: () => fetchBookingTracking(bookingId!),
    enabled: enabled && bookingId != null,
    refetchInterval: enabled ? 5000 : false,
  });
}
