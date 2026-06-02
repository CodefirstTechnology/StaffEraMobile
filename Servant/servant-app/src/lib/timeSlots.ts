const formatHour12 = (hour24: number) => {
  if (hour24 === 0 || hour24 === 24) return '12 AM';
  if (hour24 === 12) return '12 PM';
  if (hour24 < 12) return `${hour24} AM`;
  return `${hour24 - 12} PM`;
};

export const formatTimeSlotLabel = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  const startHour = parseInt(start.split(':')[0], 10);
  const endHour = parseInt(end.split(':')[0], 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return `${start} – ${end}`;
  return `${formatHour12(startHour)} to ${formatHour12(endHour)}`;
};

export const parseSessionSlots = (raw?: string | null) => {
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
