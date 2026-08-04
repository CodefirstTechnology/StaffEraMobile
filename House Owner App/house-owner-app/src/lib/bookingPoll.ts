import type { BookingWorkTimesInput } from '@/lib/bookingWorkTimes';
import { getBookingWorkTimes } from '@/lib/bookingWorkTimes';

export const BOOKING_POLL_MS = {
  awaitingAccept: 2000,
  active: 3000,
  confirmed: 2000,
  idle: 15000,
} as const;

type BookingPollRow = BookingWorkTimesInput & {
  status: string;
  servant?: unknown | null;
};

export function isAwaitingServantAccept(booking: BookingPollRow): boolean {
  return booking.status === 'PENDING';
}

export function bookingsListPollInterval(bookings: BookingPollRow[] | undefined): number | false {
  if (!bookings?.length) return false;
  if (bookings.some(isAwaitingServantAccept)) return BOOKING_POLL_MS.awaitingAccept;
  if (bookings.some((b) => b.status === 'ACTIVE')) return BOOKING_POLL_MS.active;
  if (bookings.some((b) => b.status === 'CONFIRMED')) return BOOKING_POLL_MS.confirmed;
  return BOOKING_POLL_MS.idle;
}

export function bookingDetailPollInterval(
  booking: BookingPollRow | undefined,
): number | false {
  if (!booking) return false;
  if (isAwaitingServantAccept(booking)) return BOOKING_POLL_MS.awaitingAccept;
  if (booking.status === 'ACTIVE') return BOOKING_POLL_MS.active;
  if (booking.status === 'CONFIRMED') return BOOKING_POLL_MS.confirmed;
  const workTimes = getBookingWorkTimes(booking);
  if (workTimes?.inProgress) return BOOKING_POLL_MS.active;
  return false;
}
