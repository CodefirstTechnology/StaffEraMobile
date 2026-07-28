import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';

type LocationGateStatus = 'checking' | 'granted' | 'blocked';

const BLOCKED_POLL_MS = 2000;

/** Ensures foreground location permission + device location services before app use. */
export function useLocationGate() {
  const [status, setStatus] = useState<LocationGateStatus>(
    Platform.OS === 'web' ? 'granted' : 'checking',
  );
  const evaluatingRef = useRef(false);

  const evaluate = useCallback(async (options?: { showChecking?: boolean; userInitiated?: boolean }) => {
    if (Platform.OS === 'web') {
      setStatus('granted');
      return;
    }

    if (evaluatingRef.current) return;
    evaluatingRef.current = true;

    if (options?.showChecking) {
      setStatus((prev) => (prev === 'granted' ? prev : 'checking'));
    }

    try {
      let servicesEnabled = true;
      try {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch {
        servicesEnabled = true;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && options?.userInitiated) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted' && options?.userInitiated) {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          void Location.enableNetworkProviderAsync().catch(() => {});
        }
      }

      const isGranted = permission.status === 'granted' && servicesEnabled;
      setStatus(isGranted ? 'granted' : 'blocked');
    } catch {
      setStatus('granted');
    } finally {
      evaluatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void evaluate({ showChecking: true });
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  useEffect(() => {
    if (status !== 'blocked') return;
    const interval = setInterval(() => void evaluate(), BLOCKED_POLL_MS);
    return () => clearInterval(interval);
  }, [status, evaluate]);

  return {
    checking: status === 'checking',
    blocked: status === 'blocked',
    granted: status === 'granted',
    retry: () => evaluate({ showChecking: true, userInitiated: true }),
  };
}
