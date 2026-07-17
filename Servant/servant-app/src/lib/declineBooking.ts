import api from '@/lib/api';

export async function declineBooking(
  bookingId: number,
  reason: string,
  isOpenRequest: boolean,
) {
  const path = isOpenRequest
    ? `/bookings/${bookingId}/decline-open`
    : `/bookings/${bookingId}/reject`;
  return api.patch(path, { reason });
}
