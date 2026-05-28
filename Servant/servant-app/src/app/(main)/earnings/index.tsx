import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';

export default function EarningsScreen() {
  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings;
    },
  });

  const completed = (bookings || []).filter((b: { status: string }) => b.status === 'COMPLETED');
  const total = completed.reduce(
    (s: number, b: { totalAmount?: number }) => s + (b.totalAmount || 0),
    0,
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Earnings</Text>
      <GlassCard>
        <Text style={styles.label}>Total from completed jobs</Text>
        <Text style={styles.total}>
          {Stitch.copy.rupee}
          {total.toLocaleString('en-IN')}
        </Text>
      </GlassCard>
      <Text style={styles.section}>Recent payouts</Text>
      {completed.length === 0 ? (
        <Text style={styles.empty}>Complete jobs to see earnings here</Text>
      ) : (
        completed.slice(0, 10).map((b: { id: number; totalAmount?: number; houseOwner: { user: { name: string } } }) => (
          <GlassCard key={b.id} style={styles.row}>
            <Text>{b.houseOwner.user.name}</Text>
            <Text style={styles.amt}>
              {Stitch.copy.rupee}
              {(b.totalAmount || 0).toLocaleString('en-IN')}
            </Text>
          </GlassCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  label: { color: Stitch.colors.onSurfaceVariant },
  total: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary, marginTop: 8 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  row: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  amt: { fontWeight: '700', color: Stitch.colors.secondary },
  empty: { color: Stitch.colors.onSurfaceVariant },
});
