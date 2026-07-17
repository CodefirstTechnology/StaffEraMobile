import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/** Refetch React Query data when the app returns to the foreground. */
export function setupQueryFocusManager() {
  if (Platform.OS === 'web') return;

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });
    return () => sub.remove();
  });
}
