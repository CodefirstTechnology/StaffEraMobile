import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Stitch } from '@/theme/stitch';
import { formatDateTime } from '@/lib/i18n/format';
import {
  getBookingWorkTimes,
  type BookingWorkTimesInput,
} from '@/lib/bookingWorkTimes';

type Props = {
  booking: BookingWorkTimesInput;
  style?: object;
};

export function BookingWorkTimesCard({ booking, style }: Props) {
  const { t } = useTranslation();
  const workTimes = getBookingWorkTimes(booking);

  if (!workTimes) return null;

  return (
    <GlassCard style={style}>
      <View style={styles.titleRow}>
        <MaterialIcons name="schedule" size={20} color={Stitch.colors.primary} />
        <Text style={styles.title}>{t('bookings.workDetails')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('bookings.workStartTime')}</Text>
        <Text style={styles.value}>{formatDateTime(workTimes.startTime)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('bookings.workEndTime')}</Text>
        {workTimes.inProgress ? (
          <View style={styles.inProgressWrap}>
            <View style={styles.inProgressDot} />
            <Text style={styles.inProgress}>{t('bookings.workInProgress')}</Text>
          </View>
        ) : workTimes.endTime ? (
          <Text style={styles.value}>{formatDateTime(workTimes.endTime)}</Text>
        ) : (
          <Text style={styles.muted}>—</Text>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
  },
  row: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: Stitch.colors.onBackground,
  },
  muted: {
    fontSize: 15,
    color: Stitch.colors.onSurfaceVariant,
  },
  inProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Stitch.colors.success,
  },
  inProgress: {
    fontSize: 15,
    fontWeight: '600',
    color: Stitch.colors.success,
  },
});
