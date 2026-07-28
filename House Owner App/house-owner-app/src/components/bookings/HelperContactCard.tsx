import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import type { HelperContactUser } from '@/lib/bookingContact';

type Props = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  rating?: number | null;
  verificationStatus?: string | null;
  compact?: boolean;
};

export function HelperContactCard({
  name,
  phone,
  email,
  bio,
  rating,
  verificationStatus,
  compact = false,
}: Props) {
  const { t } = useTranslation();

  if (!name && !phone && !email) return null;

  const dialHelper = () => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`);
  };

  const emailHelper = () => {
    if (!email) return;
    void Linking.openURL(`mailto:${email}`);
  };

  const isVerified = verificationStatus === 'VERIFIED' || !verificationStatus;

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{t('bookings.helperContact')}</Text>
        {isVerified && name ? <VerifiedBadge size="sm" /> : null}
      </View>
      {name ? (
        <View style={styles.row}>
          <MaterialIcons name="person-outline" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.value}>{name}</Text>
        </View>
      ) : null}
      {phone ? (
        <Pressable style={styles.row} onPress={dialHelper} accessibilityRole="button">
          <MaterialIcons name="phone" size={18} color={Stitch.colors.primary} />
          <Text style={[styles.value, styles.link]}>{phone}</Text>
        </Pressable>
      ) : null}
      {email ? (
        <Pressable style={styles.row} onPress={emailHelper} accessibilityRole="button">
          <MaterialIcons name="email" size={18} color={Stitch.colors.primary} />
          <Text style={[styles.value, styles.link]} numberOfLines={1}>
            {email}
          </Text>
        </Pressable>
      ) : null}
      {rating != null && rating > 0 ? (
        <View style={styles.row}>
          <MaterialIcons name="star" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.meta}>{t('bookings.helperRating', { rating: rating.toFixed(1) })}</Text>
        </View>
      ) : null}
      {bio && !compact ? (
        <Text style={styles.bio} numberOfLines={3}>
          {bio}
        </Text>
      ) : null}
    </View>
  );
}

export function HelperContactFromUser({
  user,
  compact,
}: {
  user: HelperContactUser;
  compact?: boolean;
}) {
  return (
    <HelperContactCard name={user.name} phone={user.phone} email={user.email} compact={compact} />
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 14,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.surfaceLow,
    gap: 8,
  },
  wrapCompact: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
  link: {
    color: Stitch.colors.primary,
  },
  meta: {
    flex: 1,
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
  },
  bio: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
});
