import { Alert, type AlertButton } from 'react-native';
import i18n from '@/lib/i18n';

/** Localized dismiss label for alert dialogs (follows selected app language). */
export function okLabel(): string {
  return i18n.t('common.ok');
}

/** Show an alert with a localized OK button when no custom buttons are supplied. */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (buttons?.length) {
    Alert.alert(title, message, buttons);
    return;
  }
  Alert.alert(title, message, [{ text: okLabel() }]);
}
