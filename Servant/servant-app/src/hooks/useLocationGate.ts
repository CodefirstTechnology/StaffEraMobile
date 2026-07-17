import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';

type LocationGateStatus = 'checking' | 'granted' | 'blocked';

/** Ensures foreground location permission + device location services before app use. */
export function useLocationGate() {
  const [status, setStatus] = useState<LocationGateStatus>(
    Platform.OS === 'web' ? 'granted' : 'checking',
  );

  const evaluate = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStatus('granted');
      return;
    }

    setStatus('checking');

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
  }, []);

  useEffect(() => {
    void evaluate();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  return {
    checking: status === 'checking',
    blocked: status === 'blocked',
    granted: status === 'granted',
    retry: evaluate,
  };
};
