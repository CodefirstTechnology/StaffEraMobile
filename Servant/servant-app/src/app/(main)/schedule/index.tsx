import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';

export default function ScheduleScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['schedule'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get('/servants/me/schedule');
      return res.data.data.bookings as Array<{
        id: number;
        status: string;
        bookingType: string;
        address?: string;
        houseOwner: { user: { name: string } };
      }>;
    },
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Schedule</Text>
      {(data || []).length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>No upcoming jobs on your calendar</Text>
        </GlassCard>
      ) : (
        (data || []).map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/(main)/schedule/${b.id}`)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{b.houseOwner.user.name}</Text>
                  <Text style={styles.meta}>{b.bookingType} · {b.address || 'Address TBD'}</Text>
                  <StatusPill status={b.status} />
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </View>
            </GlassCard>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { color: Stitch.colors.onSurfaceVariant, marginVertical: 6 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
});
