import { BOOKING_POLL_MS } from '@/lib/bookingPoll';
import type { BookingSummary } from '@/components/bookings/BookingSummaryCard';

export type HomeOpenInquiry = BookingSummary & {
  eligibleHelperCount: number;
  declinedCount: number;
  canAcceptResponses: boolean;
};

export type HomeSummary = {
  eligibleHelperCount: number;
  openInquiries: HomeOpenInquiry[];
  locationRequired: boolean;
};

export function homeSummaryPollInterval(summary: HomeSummary | undefined): number | false {
  if (!summary) return BOOKING_POLL_MS.idle;
  if (summary.openInquiries.length > 0) return BOOKING_POLL_MS.awaitingAccept;
  if (!summary.locationRequired) return BOOKING_POLL_MS.confirmed;
  return false;
}
