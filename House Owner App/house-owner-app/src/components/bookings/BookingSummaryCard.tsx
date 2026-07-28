import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate, formatDateShort, formatCurrency } from '@/lib/i18n/format';
import { getBookingDisplayAmount, isFinalBookingPrice } from '@/lib/bookingPricing';
import i18n from '@/lib/i18n';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { HelperContactCard } from '@/components/bookings/HelperContactCard';
import { showsHelperContact } from '@/lib/bookingContact';

export type BookingSummary = {
  id: number;
  status: string;
  bookingType: string;
  requestedSkill?: string | null;
  sessionDate?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionSlots?: string | null;
  createdAt?: string;
  servant?: {
    user: { name: string; phone?: string | null; email?: string | null };
    verificationStatus?: string;
  } | null;
  totalAmount?: number | null;
  finalAmount?: number | null;
  sessionHours?: number | null;
  timeEntries?: { hoursWorked?: number | null }[];
  address?: string | null;
};

type Skill = { code: string; label: string };

export function formatBookingWhen(booking: BookingSummary) {
  const slotLabel = formatSessionSlotsLabel(
    booking.sessionSlots,
    booking.sessionStartTime,
    booking.sessionEndTime,
  );
  if (booking.sessionDate && slotLabel) {
    const date = formatDate(booking.sessionDate);
    return `${date} · ${slotLabel}`;
  }
  if (booking.createdAt) {
    return i18n.t('common.requested', { date: formatDateShort(booking.createdAt) });
  }
  return null;
}

export function BookingSummaryCard({
  booking,
  skills = [],
  onPress,
  style,
}: {
  booking: BookingSummary;
  skills?: Skill[];
  onPress: () => void;
  style?: object;
}) {
  const { t } = useTranslation();
  const helperName = booking.servant?.user?.name;
  const category = booking.requestedSkill
    ? localizedSkillLabel(booking.requestedSkill, skills)
    : null;
  const when = formatBookingWhen(booking);
  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');
  const canTrack = booking.status === 'CONFIRMED' || booking.status === 'ACTIVE';
  const showContact = showsHelperContact(booking.status) && booking.servant?.user;
  const displayAmount = getBookingDisplayAmount(booking);
  const showFinalPrice = isFinalBookingPrice(booking.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={[styles.card, style]}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <MaterialIcons
              name={helperName ? 'person' : 'hourglass-top'}
              size={22}
              color={Stitch.colors.primary}
            />
          </View>
          <View style={styles.body}>
            <View style={styles.helperNameRow}>
              <Text style={styles.helperName} numberOfLines={1}>
                {helperName || t('common.waitingHelper')}
              </Text>
              {helperName &&
              (booking.servant?.verificationStatus === 'VERIFIED' ||
                !booking.servant?.verificationStatus) ? (
                <VerifiedBadge />
              ) : null}
            </View>
            <Text style={styles.meta}>
              {[category, visitType].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <StatusPill status={booking.status} />
        </View>

        {when ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color={Stitch.colors.secondary} />
            <Text style={styles.detailText}>{when}</Text>
          </View>
        ) : null}

        {showContact ? (
          <HelperContactCard
            name={booking.servant?.user.name}
            phone={booking.servant?.user.phone}
            email={booking.servant?.user.email}
            verificationStatus={booking.servant?.verificationStatus}
            compact
          />
        ) : null}

        {booking.address ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color={Stitch.colors.onSurfaceVariant} />
            <Text style={styles.detailText} numberOfLines={1}>
              {booking.address}
            </Text>
          </View>
        ) : null}

        {displayAmount != null ? (
          <Text style={styles.amount}>
            {showFinalPrice
              ? t('bookings.finalPrice', {
                  amount: `${t('common.rupee')}${formatCurrency(displayAmount)}`,
                })
              : `${t('common.rupee')}${formatCurrency(displayAmount)}`}
          </Text>
        ) : null}

        {canTrack ? (
          <View style={styles.trackRow}>
            <MaterialIcons name="my-location" size={16} color={Stitch.colors.secondary} />
            <Text style={styles.trackText}>{t('bookings.tapTrack')}</Text>
            <MaterialIcons name="chevron-right" size={18} color={Stitch.colors.secondary} />
          </View>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE', 'OTP_PENDING', 'ARRIVED'];
const RECENT_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

const ACTIVE_RANK: Record<string, number> = {
  ACTIVE: 0,
  CONFIRMED: 1,
  OTP_PENDING: 1,
  ARRIVED: 1,
  PENDING: 2,
};

function normalizeStatus(status: string): string {
  const upper = String(status || '').toUpperCase().trim();
  if (upper === 'OTP_PENDING' || upper === 'ARRIVED') return 'CONFIRMED';
  return upper;
}

function bookingSortKey(booking: BookingSummary): number {
  const when = booking.sessionDate || booking.createdAt;
  return when ? new Date(when).getTime() : 0;
}

export function splitBookings(bookings: BookingSummary[]) {
  const active: BookingSummary[] = [];
  const recent: BookingSummary[] = [];

  for (const booking of bookings) {
    const status = normalizeStatus(booking.status);
    const row = status === booking.status ? booking : { ...booking, status };
    if (ACTIVE_STATUSES.includes(status)) {
      active.push(row);
    } else if (RECENT_STATUSES.includes(status)) {
      recent.push(row);
    } else {
      active.push(row);
    }
  }

  active.sort((a, b) => {
    const rankDiff =
      (ACTIVE_RANK[normalizeStatus(a.status)] ?? 99) -
      (ACTIVE_RANK[normalizeStatus(b.status)] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return bookingSortKey(b) - bookingSortKey(a);
  });

  recent.sort((a, b) => bookingSortKey(b) - bookingSortKey(a));

  return { active, recent };
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, paddingRight: 4 },
  helperNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  helperName: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground, flexShrink: 1 },
  meta: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 3 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
  },
  amount: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: Stitch.colors.secondary,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Stitch.colors.outlineVariant,
  },
  trackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
});
