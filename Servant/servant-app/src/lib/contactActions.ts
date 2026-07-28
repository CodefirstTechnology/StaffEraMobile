import { Linking } from 'react-native';

export function normalizePhoneForLink(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function openPhoneCall(phone: string | null | undefined): void {
  if (!phone?.trim()) return;
  void Linking.openURL(`tel:${normalizePhoneForLink(phone)}`);
}
