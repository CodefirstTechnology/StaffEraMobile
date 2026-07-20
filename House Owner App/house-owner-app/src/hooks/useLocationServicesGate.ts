import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isLocationServicesEnabled } from '@/lib/locationServices';

export type LocationServicesStatus = 'checking' | 'enabled' | 'disabled';

export function useLocationServicesGate() {
  const [status, setStatus] = useState<LocationServicesStatus>('checking');

  const recheck = useCallback(async (showChecking = false) => {
    if (showChecking) setStatus('checking');
    const enabled = await isLocationServicesEnabled();
    setStatus(enabled ? 'enabled' : 'disabled');
  }, []);

  useEffect(() => {
    void recheck(true);
  }, [recheck]);

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void recheck(false);
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [recheck]);

  return { status, recheck };
};
