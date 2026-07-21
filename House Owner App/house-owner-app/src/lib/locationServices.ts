import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';

/** True when OS-level location services are on (native only; web is always allowed). */
export async function isLocationServicesEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const status = await Location.getProviderStatusAsync();
    return status.locationServicesEnabled;
  } catch {
    return false;
  }
}

/** Opens device location settings (Android) or app settings (iOS fallback). */
export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
      );
      return;
    } catch {
      // fall through to app settings
    }
  }

  await Linking.openSettings();
}
