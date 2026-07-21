export type BookingTimeEntry = {
  clockIn: string;
  clockOut: string | null;
};

export type BookingWorkTimesInput = {
  timeEntries?: BookingTimeEntry[] | null;
  workStartedAt?: string | null;
  status?: string;
};

export type BookingWorkTimes = {
  startTime: string;
  endTime: string | null;
  inProgress: boolean;
};

export function getBookingWorkTimes(booking: BookingWorkTimesInput): BookingWorkTimes | null {
  const entries = booking.timeEntries ?? [];
  const openEntry = entries.find((entry) => !entry.clockOut);

  if (entries.length === 0) {
    if (!booking.workStartedAt) return null;
    return {
      startTime: booking.workStartedAt,
      endTime: null,
      inProgress: booking.status === 'ACTIVE',
    };
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
  );

  if (openEntry) {
    return {
      startTime: openEntry.clockIn,
      endTime: null,
      inProgress: true,
    };
  }

  const lastClosed = sorted[sorted.length - 1];
  return {
    startTime: sorted[0].clockIn,
    endTime: lastClosed?.clockOut ?? null,
    inProgress: false,
  };
}
