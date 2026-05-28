import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { googleMapsApiKey?: string; googleMapId?: string }
  | undefined;

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || extra?.googleMapsApiKey || '';

export const GOOGLE_MAP_ID =
  process.env.EXPO_PUBLIC_GOOGLE_MAP_ID || extra?.googleMapId || '';

export const mapViewProps = () => ({
  ...(GOOGLE_MAP_ID ? { googleMapId: GOOGLE_MAP_ID } : {}),
});
