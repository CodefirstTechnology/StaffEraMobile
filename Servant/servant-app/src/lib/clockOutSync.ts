import type { QueryClient } from '@tanstack/react-query';

export type ClockOutTimeEntry = {
  id?: number;
  clockIn: string;
  clockOut: string | null;
  hoursWorked?: number | null;
};

export type ClockOutBooking = {
  id: number;
  status: string;
  totalAmount?: number | null;
  finalAmount?: number | null;
  bookingType?: string;
  updatedAt?: string;
  timeEntries?: ClockOutTimeEntry[];
};

function patchBookingRow<T extends ClockOutBooking>(row: T, updated: ClockOutBooking): T {
  return {
    ...row,
    status: updated.status,
    totalAmount: updated.totalAmount ?? row.totalAmount,
    finalAmount: updated.finalAmount ?? row.finalAmount,
    updatedAt: updated.updatedAt ?? new Date().toISOString(),
    ...(updated.timeEntries ? { timeEntries: updated.timeEntries } : {}),
  };
}

function patchBookingDetailCaches(qc: QueryClient, updated: ClockOutBooking) {
  for (const key of [['booking', updated.id], ['booking', String(updated.id)]] as const) {
    qc.setQueryData(key, (current: ClockOutBooking | undefined) =>
      current ? patchBookingRow(current, updated) : current,
    );
  }
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
    patchBookingDetailCaches(qc, updated);
  }

  await Promise.all([
    qc.invalidateQueries({ queryKey: ['time-today'] }),
    qc.invalidateQueries({ queryKey: ['time-month'] }),
    qc.invalidateQueries({ queryKey: ['bookings'] }),
    qc.invalidateQueries({ queryKey: ['open-requests'] }),
    qc.invalidateQueries({ queryKey: ['schedule'] }),
    qc.refetchQueries({
      predicate: (query) => query.queryKey[0] === 'booking',
    }),
  ]);
}
