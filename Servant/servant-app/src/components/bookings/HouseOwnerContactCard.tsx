import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';

type Props = {
  name?: string | null;
  phone?: string | null;
  compact?: boolean;
};

export function HouseOwnerContactCard({ name, phone, compact = false }: Props) {
  const { t } = useTranslation();

  if (!name && !phone) return null;

  const dialOwner = () => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <Text style={styles.label}>{t('schedule.customerContact')}</Text>
      {name ? (
        <View style={styles.row}>
          <MaterialIcons name="person-outline" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.value}>{name}</Text>
        </View>
      ) : null}
      {phone ? (
        <Pressable style={styles.row} onPress={dialOwner} accessibilityRole="button">
          <MaterialIcons name="phone" size={18} color={Stitch.colors.primary} />
          <Text style={[styles.value, styles.phone]}>{phone}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.surfaceLow,
    gap: 8,
  },
  wrapCompact: {
    marginTop: 8,
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Stitch.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Stitch.colors.onBackground,
  },
  phone: {
    color: Stitch.colors.primary,
  },
});
