import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';
import { stopPendingRequestVibration } from '@/lib/bookingRequestVibration';
import { localizeNotification } from '@/lib/i18n/notifications';

const CANCELLATION_TYPES = new Set(['BOOKING_CANCELLED']);

/** Refresh lists and alert when a booking cancellation notification arrives. */
export function useBookingCancellationAlerts() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const seenIds = useRef<Set<number>>(new Set());
  const bootstrapped = useRef(false);

  useEffect(() => {
    const cancelNotes = notifications.filter((n) => CANCELLATION_TYPES.has(n.type));

    if (!bootstrapped.current) {
      cancelNotes.forEach((n) => seenIds.current.add(n.id));
      bootstrapped.current = true;
      return;
    }

    const fresh = cancelNotes.filter((n) => !seenIds.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => {
      seenIds.current.add(n.id);
      const { title, body } = localizeNotification(n);
      Alert.alert(title, body);
    });

    stopPendingRequestVibration();
    void Promise.all([
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['open-requests'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['schedule'] }),
      ...fresh
        .map((n) => n.data?.bookingId)
        .filter((id): id is number => typeof id === 'number')
        .map((bookingId) => qc.invalidateQueries({ queryKey: ['booking', String(bookingId)] })),
    ]);
  }, [notifications, qc]);
}
