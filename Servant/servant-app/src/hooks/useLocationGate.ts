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

  const evaluate = useCallback(async (options?: { showChecking?: boolean }) => {
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
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('blocked');
        return;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === 'undetermined') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      setStatus(permission.status === 'granted' ? 'granted' : 'blocked');
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
    retry: () => evaluate({ showChecking: true }),
  };
};
