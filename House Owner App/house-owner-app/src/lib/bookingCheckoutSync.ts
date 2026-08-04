import type { QueryClient } from '@tanstack/react-query';
import type { BookingTimeEntry } from '@/lib/bookingWorkTimes';

export type CheckoutNotification = {
  type: string;
  data?: {
    workDetails?: Record<string, unknown>;
  } | null;
};

export type CheckoutBookingRow = {
  id: number;
  status?: string;
  timeEntries?: BookingTimeEntry[] | null;
  totalAmount?: number | null;
  finalAmount?: number | null;
  updatedAt?: string;
};

type WorkCompletedDetails = {
  clockIn?: string;
  clockOut?: string;
};

export function applyWorkCompletedNotification(
  booking: CheckoutBookingRow,
  notification: CheckoutNotification,
): CheckoutBookingRow {
  if (notification.type === 'BOOKING_COMPLETED') {
    return { ...booking, status: 'COMPLETED' };
  }

  if (notification.type !== 'WORK_COMPLETED') {
    return booking;
  }

  const workDetails = notification.data?.workDetails as WorkCompletedDetails | undefined;
  if (!workDetails?.clockOut) {
    return { ...booking, status: 'COMPLETED' };
  }

  const entries = [...(booking.timeEntries ?? [])];
  const openIdx = entries.findIndex((entry) => !entry.clockOut);
  if (openIdx >= 0) {
    entries[openIdx] = { ...entries[openIdx], clockOut: workDetails.clockOut };
  } else if (workDetails.clockIn) {
    entries.push({ clockIn: workDetails.clockIn, clockOut: workDetails.clockOut });
  }

  return {
    ...booking,
    status: 'COMPLETED',
    timeEntries: entries,
  };
}

function patchBookingList(
  rows: CheckoutBookingRow[] | undefined,
  bookingId: number,
  notification: CheckoutNotification,
) {
  return rows?.map((row) =>
    row.id === bookingId ? applyWorkCompletedNotification(row, notification) : row,
  );
}

function patchBookingDetailCaches(
  qc: QueryClient,
  bookingId: number,
  notification: CheckoutNotification,
) {
  for (const key of [['booking', String(bookingId)], ['booking', bookingId]] as const) {
    qc.setQueryData(key, (current: CheckoutBookingRow | undefined) =>
      current ? applyWorkCompletedNotification(current, notification) : current,
    );
  }
}

/** Optimistically apply checkout, then refetch authoritative booking data. */
export async function syncHouseOwnerBookingAfterCheckout(
  qc: QueryClient,
  bookingId: number,
  notification?: CheckoutNotification,
) {
  if (notification) {
    patchBookingDetailCaches(qc, bookingId, notification);
    qc.setQueryData(['bookings'], (current: CheckoutBookingRow[] | undefined) =>
      patchBookingList(current, bookingId, notification),
    );
  }

  await Promise.all([
    qc.refetchQueries({ queryKey: ['booking', String(bookingId)] }),
    qc.refetchQueries({ queryKey: ['booking', bookingId] }),
    qc.invalidateQueries({ queryKey: ['bookings'] }),
    qc.invalidateQueries({ queryKey: ['home-summary'] }),
  ]);
}
