import type { QueryClient } from '@tanstack/react-query';

export type ClockOutBooking = {
  id: number;
  status: string;
  totalAmount?: number | null;
  finalAmount?: number | null;
  bookingType?: string;
  updatedAt?: string;
};

function patchBookingRow<T extends ClockOutBooking>(row: T, updated: ClockOutBooking): T {
  return {
    ...row,
    status: updated.status,
    totalAmount: updated.totalAmount ?? row.totalAmount,
    finalAmount: updated.finalAmount ?? row.finalAmount,
    updatedAt: updated.updatedAt ?? new Date().toISOString(),
  };
}

/** Apply clock-out result locally, then refresh shared booking queries. */
export async function syncAfterClockOut(
  qc: QueryClient,
  updated?: ClockOutBooking | null,
) {
  if (updated?.id) {
    qc.setQueryData(['bookings'], (current: ClockOutBooking[] | undefined) =>
      current?.map((row) => (row.id === updated.id ? patchBookingRow(row, updated) : row)),
    );
    qc.setQueryData(['booking', String(updated.id)], (current: ClockOutBooking | undefined) =>
      current ? patchBookingRow(current, updated) : current,
    );
  }

  await Promise.all([
    qc.invalidateQueries({ queryKey: ['time-today'] }),
    qc.invalidateQueries({ queryKey: ['time-month'] }),
    qc.invalidateQueries({ queryKey: ['bookings'] }),
    qc.invalidateQueries({ queryKey: ['open-requests'] }),
    qc.invalidateQueries({ queryKey: ['schedule'] }),
    qc.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'booking',
    }),
  ]);
}
