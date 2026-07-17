/** Booking statuses shown on the Servant home dashboard (requests + today's jobs). */
export const HOME_VISIBLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ACTIVE']);

export const SCHEDULE_VISIBLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ACTIVE']);

export function isCancelled(status: string) {
  return status === 'CANCELLED';
}

export function isPendingRequest(status: string) {
  return status === 'PENDING';
}

export function isTodayJob(status: string) {
  return status === 'CONFIRMED' || status === 'ACTIVE';
}

export function isActionableBooking(status: string) {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'ACTIVE';
}
