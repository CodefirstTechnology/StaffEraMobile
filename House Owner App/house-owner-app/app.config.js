import { readFileSync } from 'fs';
import path from 'path';

const appJson = JSON.parse(
  readFileSync(path.join(__dirname, 'app.json'), 'utf8'),
);

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const googleMapId = process.env.EXPO_PUBLIC_GOOGLE_MAP_ID || '';
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

const easProjectId = appJson.expo.extra?.eas?.projectId;
const buildProfile = process.env.EAS_BUILD_PROFILE;
const otaUpdatesEnabled = buildProfile === 'production';

export default ({ config }) => ({
  ...appJson.expo,
  ...config,
  ...(otaUpdatesEnabled
    ? {
        runtimeVersion: { policy: 'appVersion' },
        updates: {
          enabled: true,
          fallbackToCacheTimeout: 0,
          url: `https://u.expo.dev/${easProjectId}`,
        },
      }
    : {
        updates: { enabled: false },
      }),
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios?.config,
      googleMapsApiKey,
    },
  },
  plugins: [
    ...(appJson.expo.plugins || []),
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'StaffEra uses your location to set your home address and find nearby help.',
      },
    ],
  ],
  extra: {
    ...appJson.expo.extra,
    apiBaseUrl,
    googleMapsApiKey,
    googleMapId,
    eas: {
      ...(appJson.expo.extra?.eas || {}),
    },
  },
});
