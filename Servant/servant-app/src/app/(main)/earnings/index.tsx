import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  bookingEarningAmount,
  computeTodayEarnings,
  computeMonthlyEarnings,
  isCompletedToday,
  isCompletedThisMonth,
} from '@/lib/earnings';

export default function EarningsScreen() {
  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings;
    },
    refetchInterval: 20000,
  });

  const { data: profile } = useQuery({
    queryKey: ['servant-profile'],
    queryFn: async () => {
      const res = await api.get('/servants/me');
      return res.data.data.servant as { hourlyRate?: number | null };
    },
  });

  const { data: timeToday } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data as { totalHours?: number; estimatedEarnings?: number; hourlyRate?: number };
    },
    refetchInterval: 20000,
  });

  const { data: monthStats } = useQuery({
    queryKey: ['time-month'],
    queryFn: async () => {
      const res = await api.get('/time/month');
      return res.data.data as {
        totalEarnings?: number;
        completedCount?: number;
        monthLabel?: string;
      };
    },
    refetchInterval: 20000,
  });

  const hourlyRate = profile?.hourlyRate ?? timeToday?.hourlyRate ?? 0;
  const todayStats = computeTodayEarnings(bookings || [], hourlyRate, timeToday);
  const monthlyFromBookings = computeMonthlyEarnings(bookings || [], hourlyRate);
  const monthlyAmount = Math.max(monthStats?.totalEarnings ?? 0, monthlyFromBookings.amount);
  const monthlyCount = Math.max(
    monthStats?.completedCount ?? 0,
    monthlyFromBookings.completedCount,
  );
  const monthLabel = monthStats?.monthLabel ?? monthlyFromBookings.monthLabel;
  const completed = (bookings || []).filter((b) => isCompletedToday(b));
  const completedMonth = (bookings || []).filter((b) => isCompletedThisMonth(b));

  const allCompleted = (bookings || []).filter((b: { status: string }) => b.status === 'COMPLETED');
  const totalAll = allCompleted.reduce(
    (s: number, b: { totalAmount?: number; sessionHours?: number | null }) =>
      s + bookingEarningAmount(b, hourlyRate),
    0,
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Earnings</Text>

      <GlassCard style={styles.card}>
        <Text style={styles.label}>This month · {monthLabel}</Text>
        <Text style={styles.total}>
          {Stitch.copy.rupee}
          {monthlyAmount.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.hint}>
          {monthlyCount > 0
            ? `${monthlyCount} completed job${monthlyCount === 1 ? '' : 's'} in ${monthLabel}`
            : 'Completed visits in this calendar month'}
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.label}>Today&apos;s earnings</Text>
        <Text style={styles.total}>
          {Stitch.copy.rupee}
          {todayStats.amount.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.hint}>
          {todayStats.completedCount > 0
            ? `${todayStats.completedCount} completed job${todayStats.completedCount === 1 ? '' : 's'} today`
            : todayStats.hoursToday > 0
              ? `${todayStats.hoursToday.toFixed(1)} hours × ${Stitch.copy.rupee}${hourlyRate}/hr`
              : 'Updates when you clock out or visit slots end'}
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.label}>All-time from completed jobs</Text>
        <Text style={styles.totalSm}>
          {Stitch.copy.rupee}
          {totalAll.toLocaleString('en-IN')}
        </Text>
      </GlassCard>

      <Text style={styles.section}>This month&apos;s completed jobs</Text>
      {completedMonth.length === 0 ? (
        <Text style={styles.empty}>No completed jobs this month yet</Text>
      ) : (
        completedMonth.map(
          (b: {
            id: number;
            totalAmount?: number;
            sessionHours?: number | null;
            houseOwner: { user: { name: string } };
          }) => (
            <GlassCard key={`m-${b.id}`} style={styles.row}>
              <View>
                <Text style={styles.rowName}>{b.houseOwner.user.name}</Text>
                <Text style={styles.rowMeta}>{monthLabel}</Text>
              </View>
              <Text style={styles.amt}>
                {Stitch.copy.rupee}
                {bookingEarningAmount(b, hourlyRate).toLocaleString('en-IN')}
              </Text>
            </GlassCard>
          ),
        )
      )}

      <Text style={styles.section}>Today&apos;s completed jobs</Text>
      {completed.length === 0 ? (
        <Text style={styles.empty}>Complete a visit to see earnings here</Text>
      ) : (
        completed.map(
          (b: {
            id: number;
            totalAmount?: number;
            sessionHours?: number | null;
            houseOwner: { user: { name: string } };
          }) => (
            <GlassCard key={b.id} style={styles.row}>
              <View>
                <Text style={styles.rowName}>{b.houseOwner.user.name}</Text>
                <Text style={styles.rowMeta}>Completed today</Text>
              </View>
              <Text style={styles.amt}>
                {Stitch.copy.rupee}
                {bookingEarningAmount(b, hourlyRate).toLocaleString('en-IN')}
              </Text>
            </GlassCard>
          ),
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  card: { marginBottom: 12 },
  label: { color: Stitch.colors.onSurfaceVariant, fontSize: 14 },
  total: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary, marginTop: 8 },
  totalSm: { fontSize: 24, fontWeight: '700', color: Stitch.colors.secondary, marginTop: 8 },
  hint: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 8, lineHeight: 18 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  row: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: { fontWeight: '600', fontSize: 16 },
  rowMeta: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  amt: { fontWeight: '700', color: Stitch.colors.secondary, fontSize: 16 },
  empty: { color: Stitch.colors.onSurfaceVariant },
});
