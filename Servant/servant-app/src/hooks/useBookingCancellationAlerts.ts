import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import { useDeclinedOpenBookingIds, isDeclinedOpenBooking } from '@/hooks/useDeclinedOpenBookingIds';
import { stopPendingRequestVibration } from '@/lib/bookingRequestVibration';
import { localizeNotification } from '@/lib/i18n/notifications';

const CANCELLATION_TYPES = new Set(['BOOKING_CANCELLED']);

type BookingRow = { id: number; status: string };

/** Refresh lists and alert when a booking cancellation arrives — skip bookings the servant already declined. */
export function useBookingCancellationAlerts() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { data: declinedOpenIds = [] } = useDeclinedOpenBookingIds();
  const declinedOpenIdsRef = useRef(declinedOpenIds);
  const seenNotificationIds = useRef<Set<number>>(new Set());
  const seenCancelledBookingIds = useRef<Set<number>>(new Set());
  const previousStatuses = useRef<Map<number, string>>(new Map());
  const bootstrapped = useRef(false);

  useEffect(() => {
    declinedOpenIdsRef.current = declinedOpenIds;
  }, [declinedOpenIds]);

  const shouldIgnoreBooking = (bookingId: number) =>
    isDeclinedOpenBooking(bookingId, declinedOpenIdsRef.current);

  const invalidateBookingQueries = (bookingIds: number[] = []) => {
    stopPendingRequestVibration();
    void Promise.all([
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['open-requests'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['declined-open-booking-ids'] }),
      qc.invalidateQueries({ queryKey: ['schedule'] }),
      ...bookingIds.map((bookingId) =>
        qc.invalidateQueries({ queryKey: ['booking', String(bookingId)] }),
      ),
    ]);
  };

  const markCancelled = (bookingId: number) => {
    if (shouldIgnoreBooking(bookingId)) return false;
    if (seenCancelledBookingIds.current.has(bookingId)) return false;
    seenCancelledBookingIds.current.add(bookingId);
    return true;
  };

  useEffect(() => {
    const cancelNotes = notifications.filter((n) => CANCELLATION_TYPES.has(n.type));

    if (!bootstrapped.current) {
      cancelNotes.forEach((n) => seenNotificationIds.current.add(n.id));
      bootstrapped.current = true;
      return;
    }

    const fresh = cancelNotes.filter((n) => !seenNotificationIds.current.has(n.id));
    if (fresh.length === 0) return;

    const bookingIds: number[] = [];

    fresh.forEach((n) => {
      seenNotificationIds.current.add(n.id);
      const bookingId = n.data?.bookingId;
      let shouldAlert = true;
      if (typeof bookingId === 'number') {
        shouldAlert = markCancelled(bookingId);
        if (shouldAlert) bookingIds.push(bookingId);
      }
      if (!shouldAlert) return;
      const { title, body } = localizeNotification(n);
      Alert.alert(title, body);
    });

    if (bookingIds.length > 0) {
      invalidateBookingQueries(bookingIds);
    }
  }, [notifications, qc]);

  useEffect(() => {
    const evaluateBookings = () => {
      const bookings = qc.getQueryData<BookingRow[]>(['bookings']) ?? [];
      const openRequests = qc.getQueryData<BookingRow[]>(['open-requests']) ?? [];
      const rows = [...bookings, ...openRequests];

      if (!bootstrapped.current) {
        rows.forEach((row) => previousStatuses.current.set(row.id, row.status));
        return;
      }

      const newlyCancelled: number[] = [];

      rows.forEach((row) => {
        const previous = previousStatuses.current.get(row.id);
        if (
          previous &&
          previous !== 'CANCELLED' &&
          row.status === 'CANCELLED' &&
          markCancelled(row.id)
        ) {
          newlyCancelled.push(row.id);
        }
        previousStatuses.current.set(row.id, row.status);
      });

      if (newlyCancelled.length > 0) {
        Alert.alert(
          t('pushNotifications.BOOKING_CANCELLED.title'),
          t('pushNotifications.BOOKING_CANCELLED.body'),
        );
        invalidateBookingQueries(newlyCancelled);
      }
    };

    evaluateBookings();
    return qc.getQueryCache().subscribe(evaluateBookings);
  }, [qc, t]);
}
