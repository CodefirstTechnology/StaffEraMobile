export type BookingPricingInput = {
  status?: string;
  bookingType?: string;
  totalAmount?: number | null;
  finalAmount?: number | null;
  sessionHours?: number | null;
  timeEntries?: { hoursWorked?: number | null }[];
  servant?: { hourlyRate?: number | null; monthlyRate?: number | null };
};

export const isFinalBookingPrice = (status?: string) => status === 'COMPLETED';

export const getBookingDisplayAmount = (
  booking: BookingPricingInput,
  hourlyRate = 0,
): number | null => {
  if (booking.finalAmount != null && booking.finalAmount > 0) {
    return booking.finalAmount;
  }

  if (booking.status === 'COMPLETED' && booking.totalAmount != null && booking.totalAmount > 0) {
    return booking.totalAmount;
  }

  const rate = hourlyRate || booking.servant?.hourlyRate || 0;

  if (booking.bookingType === 'MONTHLY') {
    if (booking.totalAmount != null && booking.totalAmount > 0) {
      return booking.totalAmount;
    }
    if (booking.servant?.monthlyRate != null && booking.servant.monthlyRate > 0) {
      return booking.servant.monthlyRate;
    }
    return null;
  }

  const hoursFromEntries = (booking.timeEntries || []).reduce(
    (sum, entry) => sum + (entry.hoursWorked || 0),
    0,
  );
  if (hoursFromEntries > 0 && rate > 0) {
    return Math.round(hoursFromEntries * rate * 100) / 100;
  }

  if (booking.totalAmount != null && booking.totalAmount > 0) {
    return booking.totalAmount;
  }

  if (booking.sessionHours && booking.sessionHours > 0 && rate > 0) {
    return Math.round(booking.sessionHours * rate * 100) / 100;
  }

  return null;
};
