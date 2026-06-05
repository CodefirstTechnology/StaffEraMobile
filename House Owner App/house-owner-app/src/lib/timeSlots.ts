import i18n from '@/lib/i18n';
import { getIntlLocale } from '@/lib/i18n';

export type TimeSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
};

export type SessionSlot = {
  start: string;
  end: string;
};

const formatHour12 = (hour24: number) => {
  if (hour24 === 0 || hour24 === 24) return '12 AM';
  if (hour24 === 12) return '12 PM';
  if (hour24 < 12) return `${hour24} AM`;
  return `${hour24 - 12} PM`;
};

const formatHour12Locale = (hour24: number) => {
  const d = new Date(2000, 0, 1, hour24, 0, 0, 0);
  return d.toLocaleTimeString(getIntlLocale(i18n.language), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const localizedTimeSlotLabel = (start: string, end: string) => {
  const startHour = parseInt(start.split(':')[0], 10);
  const endHour = parseInt(end.split(':')[0], 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return `${start} – ${end}`;
  return i18n.t('timeSlots.range', {
    start: formatHour12Locale(startHour),
    end: formatHour12Locale(endHour),
  });
};

export const localizedSlotLabels = (slots: TimeSlot[]) =>
  slots.map((s) => localizedTimeSlotLabel(s.start, s.end)).join(' · ');

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const HOURLY_TIME_SLOTS: TimeSlot[] = Array.from({ length: 14 }, (_, i) => {
  const hour = 7 + i;
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  return {
    id: `${start}-${end}`,
    start,
    end,
    label: `${formatHour12(hour)} to ${formatHour12(hour + 1)}`,
  };
});

export const DEFAULT_TIME_SLOTS = [HOURLY_TIME_SLOTS.find((s) => s.start === '09:00')!];

export const sortTimeSlots = (slots: TimeSlot[]) =>
  [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

export const toggleTimeSlot = (selected: TimeSlot[], slot: TimeSlot): TimeSlot[] => {
  const exists = selected.some((s) => s.id === slot.id);
  const next = exists ? selected.filter((s) => s.id !== slot.id) : [...selected, slot];
  return sortTimeSlots(next);
};

export const slotsToPayload = (slots: TimeSlot[]): SessionSlot[] =>
  sortTimeSlots(slots).map(({ start, end }) => ({ start, end }));

export const formatTimeSlotLabel = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  const startHour = parseInt(start.split(':')[0], 10);
  const endHour = parseInt(end.split(':')[0], 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return `${start} – ${end}`;
  return localizedTimeSlotLabel(start, end);
};

export const parseSessionSlots = (raw?: string | null): SessionSlot[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slot) => slot?.start && slot?.end);
  } catch {
    return [];
  }
};

export const formatSessionSlotsLabel = (
  sessionSlots?: string | null,
  start?: string | null,
  end?: string | null,
) => {
  const slots = parseSessionSlots(sessionSlots);
  if (slots.length > 0) {
    return slots
      .map((slot) => formatTimeSlotLabel(slot.start, slot.end))
      .filter(Boolean)
      .join(', ');
  }
  const single = formatTimeSlotLabel(start, end);
  return single || null;
};
