import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

const SYNC_MS = 2000;

/** Keep bookings, open requests, and notifications in sync while the app is open. */
export function useBookingRealtimeSync() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = () => {
      void Promise.all([
        qc.refetchQueries({ queryKey: ['bookings'] }),
        qc.refetchQueries({ queryKey: ['open-requests'] }),
        qc.refetchQueries({ queryKey: ['notifications'] }),
        qc.refetchQueries({ queryKey: ['declined-open-booking-ids'] }),
        qc.refetchQueries({ queryKey: ['time-today'] }),
        qc.refetchQueries({ queryKey: ['time-month'] }),
        qc.refetchQueries({
          predicate: (query) => query.queryKey[0] === 'booking',
        }),
      ]);
    };

    refresh();

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(refresh, SYNC_MS);
    };

    const stopPolling = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const handleAppState = (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refresh();
      }
      appState.current = next;
      if (next === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (AppState.currentState === 'active') {
      startPolling();
    }

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
      stopPolling();
    };
  }, [isAuthenticated, qc]);
}
