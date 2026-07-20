import type { TimeSlot } from '@/lib/timeSlots';
import {
  HOURLY_TIME_SLOTS,
  localizedTimeSlotLabel,
  parseSessionSlots,
} from '@/lib/timeSlots';

export type BookingEditMode = 'none' | 'notes' | 'full';

export function getBookingEditMode(status: string): BookingEditMode {
  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(status)) return 'none';
  if (status === 'ACTIVE') return 'notes';
  if (['PENDING', 'CONFIRMED'].includes(status)) return 'full';
  return 'none';
}

export function sessionSlotsToTimeSlots(
  sessionSlots?: string | null,
  sessionStartTime?: string | null,
  sessionEndTime?: string | null,
): TimeSlot[] {
  const parsed = parseSessionSlots(sessionSlots);
  const slots =
    parsed.length > 0
      ? parsed
      : sessionStartTime && sessionEndTime
        ? [{ start: sessionStartTime, end: sessionEndTime }]
        : [];

  return slots.map((slot) => {
    const match = HOURLY_TIME_SLOTS.find(
      (row) => row.start === slot.start && row.end === slot.end,
    );
    return (
      match ?? {
        id: `${slot.start}-${slot.end}`,
        start: slot.start,
        end: slot.end,
        label: localizedTimeSlotLabel(slot.start, slot.end),
      }
    );
  });
}
