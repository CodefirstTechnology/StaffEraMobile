import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TimeScreen() {
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
    booking?: { address?: string };
  };
  const entries = (data?.entries || []) as Entry[];

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Today&apos;s time</Text>
      <Text style={styles.sub}>
        Total hours: {data?.totalHours?.toFixed(1) ?? '0.0'}
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <GlassCard>
            <Text style={styles.empty}>Clock in from Home when you reach the customer</Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Text style={styles.row}>
              In: {new Date(item.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.row}>
              Out:{' '}
              {item.clockOut
                ? new Date(item.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : 'On duty'}
            </Text>
            {item.hoursWorked != null && (
              <Text style={styles.hours}>{item.hoursWorked} hrs</Text>
            )}
          </GlassCard>
        )}
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
  row: { fontSize: 15 },
  hours: { marginTop: 6, fontWeight: '700', color: Stitch.colors.secondary },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
});
