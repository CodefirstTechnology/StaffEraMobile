import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { openPhoneCall } from '@/lib/contactActions';

type Props = {
  phone?: string | null;
};

export function ContactActionButtons({ phone }: Props) {
  const { t } = useTranslation();

  if (!phone?.trim()) return null;

  return (
    <TouchableOpacity
      style={styles.callBtn}
      onPress={() => openPhoneCall(phone)}
      accessibilityRole="button"
      accessibilityLabel={t('bookings.callHelper')}
    >
      <MaterialIcons name="phone" size={20} color="#fff" />
      <Text style={styles.callText}>{t('bookings.call')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Stitch.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  callText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
