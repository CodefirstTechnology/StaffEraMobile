/** Booking statuses shown on the Servant home dashboard (requests + today's jobs). */
export const HOME_VISIBLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ACTIVE']);

export const SCHEDULE_ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ACTIVE']);

/** @deprecated Use SCHEDULE_ACTIVE_STATUSES */
export const SCHEDULE_VISIBLE_STATUSES = SCHEDULE_ACTIVE_STATUSES;

export const COMPLETED_JOB_STATUS = 'COMPLETED';

export function isCancelled(status: string) {
  return status === 'CANCELLED';
}

export function isPendingRequest(status: string) {
  return status === 'PENDING';
}

export function isActiveJob(status: string) {
  return HOME_VISIBLE_STATUSES.has(status);
}

export function isCompletedJob(status: string) {
  return status === COMPLETED_JOB_STATUS;
}

export function isTodayJob(status: string) {
  return status === 'CONFIRMED' || status === 'ACTIVE';
}

export function isActionableBooking(status: string) {
  return isActiveJob(status);
}

export function jobSortKey(booking: { sessionDate?: string | null; updatedAt?: string }) {
  const when = booking.sessionDate || booking.updatedAt;
  return when ? new Date(when).getTime() : 0;
}

export function splitServantJobs<T extends { status: string; sessionDate?: string | null; updatedAt?: string }>(
  bookings: T[],
) {
  const active = bookings.filter((b) => isActiveJob(b.status));
  const completed = bookings.filter((b) => isCompletedJob(b.status));

  active.sort((a, b) => jobSortKey(a) - jobSortKey(b));
  completed.sort((a, b) => jobSortKey(b) - jobSortKey(a));

  return { active, completed };
}
