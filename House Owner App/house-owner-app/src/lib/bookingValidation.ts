import type { TFunction } from 'i18next';
import type { LocationValue } from '@/lib/locationTypes';
import { getAvailableTimeSlots, type TimeSlot } from '@/lib/timeSlots';

export type BookingFieldErrors = {
  category?: string;
  timeSlots?: string;
  sessionStart?: string;
  sessionEnd?: string;
  location?: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeFormat(time: string): boolean {
  return TIME_PATTERN.test(time.trim());
}

export function isValidSessionTimeRange(start: string, end: string): boolean {
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) return false;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em > sh * 60 + sm;
}

export type ValidateBookingFormInput = {
  t: TFunction;
  bookingType: 'SESSION' | 'MONTHLY';
  requireCategory: boolean;
  selectedSkill?: string;
  useTimeSlotPicker: boolean;
  timeSlots: TimeSlot[];
  sessionDate: Date;
  sessionStart?: string;
  sessionEnd?: string;
  location: LocationValue | null;
  requireLocation: boolean;
};

export function validateBookingForm(input: ValidateBookingFormInput): {
  errors: BookingFieldErrors;
  sessionSlotsToSend: TimeSlot[];
  valid: boolean;
} {
  const errors: BookingFieldErrors = {};
  let sessionSlotsToSend = input.timeSlots;

  if (input.requireCategory && !input.selectedSkill?.trim()) {
    errors.category = input.t('bookings.categoryRequired');
  }

  if (input.bookingType === 'SESSION') {
    if (input.useTimeSlotPicker) {
      const available = getAvailableTimeSlots(input.sessionDate);
      sessionSlotsToSend = input.timeSlots.filter((slot) =>
        available.some((row) => row.id === slot.id),
      );
      if (sessionSlotsToSend.length === 0) {
        errors.timeSlots =
          available.length === 0
            ? input.t('timeSlots.noneLeftToday')
            : input.t('timeSlots.pickAtLeastOne');
      }
    } else {
      const start = (input.sessionStart ?? '').trim();
      const end = (input.sessionEnd ?? '').trim();
      if (!start) {
        errors.sessionStart = input.t('bookings.startTimeRequired');
      } else if (!isValidTimeFormat(start)) {
        errors.sessionStart = input.t('bookings.invalidTimeFormat');
      }
      if (!end) {
        errors.sessionEnd = input.t('bookings.endTimeRequired');
      } else if (!isValidTimeFormat(end)) {
        errors.sessionEnd = input.t('bookings.invalidTimeFormat');
      }
      if (!errors.sessionStart && !errors.sessionEnd && start && end && !isValidSessionTimeRange(start, end)) {
        errors.sessionEnd = input.t('bookings.invalidTimeRange');
      }
    }
  }

  if (input.requireLocation) {
    const loc = input.location;
    if (
      !loc?.address?.trim() ||
      loc.latitude == null ||
      loc.longitude == null ||
      Number.isNaN(loc.latitude) ||
      Number.isNaN(loc.longitude)
    ) {
      errors.location = input.t('bookings.visitLocationRequired');
    }
  }

  return {
    errors,
    sessionSlotsToSend,
    valid: Object.keys(errors).length === 0,
  };
}

export function hasBookingFieldErrors(errors: BookingFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
