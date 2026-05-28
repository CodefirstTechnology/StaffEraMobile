import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';

export default function BookingsListScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings;
    },
  });

  return (
    <View style={styles.root}>
      <Text style={styles.title}>My bookings</Text>
      <FlatList
        data={data || []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <GlassCard>
            <Text style={styles.empty}>
              {isLoading ? 'Loading…' : 'No bookings yet. Browse verified helpers to book.'}
            </Text>
          </GlassCard>
        }
        renderItem={({
          item,
        }: {
          item: {
            id: number;
            status: string;
            bookingType: string;
            servant: { user: { name: string } };
            totalAmount?: number;
          };
        }) => (
          <TouchableOpacity onPress={() => router.push(`/(main)/bookings/${item.id}`)}>
            <GlassCard style={styles.card}>
              <Text style={styles.name}>{item.servant.user.name}</Text>
              <Text style={styles.meta}>{item.bookingType}</Text>
              {item.totalAmount != null && (
                <Text style={styles.amount}>
                  {Stitch.copy.rupee}
                  {item.totalAmount.toLocaleString('en-IN')}
                </Text>
              )}
              <StatusPill status={item.status} />
            </GlassCard>
          </TouchableOpacity>
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
    paddingBottom: 12,
  },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  card: { marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4, marginBottom: 6 },
  amount: { fontWeight: '600', color: Stitch.colors.secondary, marginBottom: 8 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
});
