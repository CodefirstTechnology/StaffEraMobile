import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type PermissionMessages = {
  title: string;
  body: string;
  openSettings: string;
  cancel: string;
};

type PermissionResponse = {
  granted: boolean;
  canAskAgain: boolean;
};

function showPermissionDeniedAlert(messages: PermissionMessages) {
  Alert.alert(messages.title, messages.body, [
    { text: messages.cancel, style: 'cancel' },
    {
      text: messages.openSettings,
      onPress: () => {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          void Linking.openSettings();
        }
      },
    },
  ]);
}

async function ensurePermission(
  get: () => Promise<PermissionResponse>,
  request: () => Promise<PermissionResponse>,
  messages: PermissionMessages,
): Promise<boolean> {
  let permission = await get();
  if (permission.granted) return true;

  if (permission.canAskAgain) {
    permission = await request();
    if (permission.granted) return true;
  }

  showPermissionDeniedAlert(messages);
  return false;
}

export async function ensureMediaLibraryPermission(messages: PermissionMessages): Promise<boolean> {
  return ensurePermission(
    ImagePicker.getMediaLibraryPermissionsAsync,
    ImagePicker.requestMediaLibraryPermissionsAsync,
    messages,
  );
}

export async function ensureCameraPermission(messages: PermissionMessages): Promise<boolean> {
  return ensurePermission(
    ImagePicker.getCameraPermissionsAsync,
    ImagePicker.requestCameraPermissionsAsync,
    messages,
  );
}
