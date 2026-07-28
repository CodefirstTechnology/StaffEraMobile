import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatTime } from '@/lib/i18n/format';
import { formatDurationFromHours } from '@/lib/formatDuration';

export default function TimeScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['time-today'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data;
    },
  });

  type Entry = {
    id: number;
    clockIn: string;
    clockOut: string | null;
    hoursWorked?: number;
    booking?: {
      id?: number;
      address?: string;
      flatNo?: string;
      building?: string;
      area?: string;
      bookingType?: string;
      requestedSkill?: string;
      houseOwner?: {
        user?: {
          name?: string;
          phone?: string;
        };
      };
    };
  };
  const entries = (data?.entries || []) as Entry[];

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('time.todayTitle')}</Text>
      <Text style={styles.sub}>
        {t('time.totalHoursLabel', {
          duration: formatDurationFromHours(data?.totalHours ?? 0),
        })}
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <GlassCard>
            <Text style={styles.empty}>{t('time.clockInHint')}</Text>
          </GlassCard>
        }
        renderItem={({ item }) => {
          const ownerName = item.booking?.houseOwner?.user?.name || t('schedule.customer');
          const jobTypeLabel =
            item.booking?.bookingType === 'SESSION'
              ? t('common.oneVisit')
              : item.booking?.bookingType === 'MONTHLY'
                ? t('common.monthly')
                : null;
          const skill = item.booking?.requestedSkill;

          return (
            <GlassCard style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.ownerName}>{ownerName}</Text>
                {jobTypeLabel ? <Text style={styles.jobTypeBadge}>{jobTypeLabel}</Text> : null}
              </View>
              {skill ? <Text style={styles.skillText}>Skill: {skill}</Text> : null}
              <View style={styles.timeDivider} />
              <Text style={styles.row}>
                {t('time.clockInAt', { time: formatTime(item.clockIn) })}
              </Text>
              <Text style={styles.row}>
                {item.clockOut
                  ? t('time.clockOutAt', { time: formatTime(item.clockOut) })
                  : t('time.onDuty')}
              </Text>
              {item.hoursWorked != null && (
                <Text style={styles.hours}>
                  {t('time.hoursShort', { duration: formatDurationFromHours(item.hoursWorked) })}
                </Text>
              )}
            </GlassCard>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Stitch.colors.primary,
    paddingTop: 56,
    paddingHorizontal: Stitch.spacing.padding,
  },
  sub: {
    paddingHorizontal: Stitch.spacing.padding,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  card: { marginBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
  jobTypeBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Stitch.colors.secondary,
    backgroundColor: Stitch.colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  timeDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 6,
  },
  row: { fontSize: 14, color: Stitch.colors.onBackground, marginTop: 2 },
  hours: { marginTop: 6, fontWeight: '700', color: Stitch.colors.secondary },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
});
