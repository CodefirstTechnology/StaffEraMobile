import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { useDeclinedOpenBookingIds, isDeclinedOpenBooking } from '@/hooks/useDeclinedOpenBookingIds';
import { stopPendingRequestVibration } from '@/lib/bookingRequestVibration';
import { localizeNotification } from '@/lib/i18n/notifications';

const CANCELLATION_TYPES = new Set(['BOOKING_CANCELLED']);

type BookingRow = { id: number; status: string };

/** One popup per cancelled booking — refresh lists when status or notifications change. */
export function useBookingCancellationAlerts() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: notifications = [], isSuccess: notificationsReady } = useNotifications();
  const { data: declinedOpenIds = [] } = useDeclinedOpenBookingIds();
  const declinedOpenIdsRef = useRef(declinedOpenIds);
  const seenNotificationIds = useRef<Set<number>>(new Set());
  const alertedBookingIds = useRef<Set<number>>(new Set());
  const previousStatuses = useRef<Map<number, string>>(new Map());
  const notificationsBootstrapped = useRef(false);
  const bookingsBootstrapped = useRef(false);

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

  const alertCancellationOnce = (bookingId: number | undefined, notification?: AppNotification) => {
    if (bookingId != null) {
      if (shouldIgnoreBooking(bookingId) || alertedBookingIds.current.has(bookingId)) return false;
      alertedBookingIds.current.add(bookingId);
    }

    if (notification) {
      const { title, body } = localizeNotification(notification);
      Alert.alert(title, body);
    } else {
      Alert.alert(
        t('pushNotifications.BOOKING_CANCELLED.title'),
        t('pushNotifications.BOOKING_CANCELLED.body'),
      );
    }
    return true;
  };

  useEffect(() => {
    if (!notificationsReady) return;

    const cancelNotes = notifications.filter((n) => CANCELLATION_TYPES.has(n.type));

    if (!notificationsBootstrapped.current) {
      cancelNotes.forEach((n) => {
        seenNotificationIds.current.add(n.id);
        const bookingId = n.data?.bookingId;
        if (typeof bookingId === 'number') {
          alertedBookingIds.current.add(bookingId);
        }
      });
      notificationsBootstrapped.current = true;
      return;
    }

    const fresh = cancelNotes.filter((n) => !seenNotificationIds.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => seenNotificationIds.current.add(n.id));

    const byBookingId = new Map<number, AppNotification>();
    const withoutBookingId: AppNotification[] = [];

    fresh.forEach((n) => {
      const bookingId = n.data?.bookingId;
      if (typeof bookingId === 'number') {
        if (!byBookingId.has(bookingId)) byBookingId.set(bookingId, n);
      } else {
        withoutBookingId.push(n);
      }
    });

    const bookingIds: number[] = [];

    byBookingId.forEach((note, bookingId) => {
      if (alertCancellationOnce(bookingId, note)) {
        bookingIds.push(bookingId);
      }
    });

    withoutBookingId.forEach((note) => {
      const { title, body } = localizeNotification(note);
      Alert.alert(title, body);
    });

    if (bookingIds.length > 0) {
      invalidateBookingQueries(bookingIds);
    }
  }, [notifications, notificationsReady, qc, t]);

  useEffect(() => {
    const evaluateBookings = () => {
      const bookings = qc.getQueryData<BookingRow[]>(['bookings']) ?? [];
      const openRequests = qc.getQueryData<BookingRow[]>(['open-requests']) ?? [];
      const rows = [...bookings, ...openRequests];

      if (!bookingsBootstrapped.current) {
        rows.forEach((row) => previousStatuses.current.set(row.id, row.status));
        bookingsBootstrapped.current = true;
        return;
      }

      const changedIds: number[] = [];

      rows.forEach((row) => {
        const previous = previousStatuses.current.get(row.id);
        if (previous && previous !== 'CANCELLED' && row.status === 'CANCELLED') {
          changedIds.push(row.id);
        }
        previousStatuses.current.set(row.id, row.status);
      });

      previousStatuses.current.forEach((_, id) => {
        if (!rows.some((row) => row.id === id)) {
          previousStatuses.current.delete(id);
        }
      });

      if (changedIds.length === 0) return;

      const needsRefresh = changedIds.some((id) => !shouldIgnoreBooking(id));
      if (needsRefresh) {
        invalidateBookingQueries(changedIds);
      }
    };

    evaluateBookings();
    return qc.getQueryCache().subscribe(evaluateBookings);
  }, [qc]);
}
