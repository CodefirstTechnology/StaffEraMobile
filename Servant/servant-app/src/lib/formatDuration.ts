/** Format hours + minutes as `2h 30m`, `45m`, or `3h`. */
export function formatHoursMinutes(hours: number, minutes: number): string {
  const h = Math.max(0, Math.floor(hours));
  let m = Math.max(0, Math.round(minutes));

  if (m >= 60) {
    const carry = Math.floor(m / 60);
    m = m % 60;
    return formatHoursMinutes(h + carry, m);
  }

  if (h === 0 && m === 0) return '0m';
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ');
}

/** Decimal hours (e.g. 2.5) → `2h 30m`. */
export function formatDurationFromHours(totalHours: number): string {
  if (!Number.isFinite(totalHours) || totalHours <= 0) return '0m';
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  return formatHoursMinutes(hours, minutes);
}

/** Elapsed seconds → `2h 30m` (minutes only; no seconds in display). */
export function formatDurationFromSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return formatHoursMinutes(hours, minutes);
}
