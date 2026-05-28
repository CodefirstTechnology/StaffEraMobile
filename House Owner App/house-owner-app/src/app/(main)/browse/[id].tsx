import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';

export default function ServantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: servant, isLoading } = useQuery({
    queryKey: ['servant', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/servants/${id}`);
      return res.data.data.servant;
    },
  });

  if (isLoading || !servant) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
      </Pressable>
      <GlassCard>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{servant.user.name[0]}</Text>
        </View>
        <Text style={styles.name}>{servant.user.name}</Text>
        <View style={styles.verified}>
          <MaterialIcons name="verified" size={16} color={Stitch.colors.success} />
          <Text style={styles.verifiedText}>Agent verified</Text>
        </View>
        <Text style={styles.skills}>
          {servant.skills?.map((s: { skillName: string }) => s.skillName).join(' · ')}
        </Text>
        <Text style={styles.rate}>
          ★ {servant.rating?.toFixed(1) || '0.0'} · {Stitch.copy.rupee}
          {servant.hourlyRate || '—'}/hr · {Stitch.copy.rupee}
          {servant.monthlyRate || '—'}/mo
        </Text>
        {servant.bio ? <Text style={styles.bio}>{servant.bio}</Text> : null}
        {servant.zones?.length > 0 ? (
          <View style={styles.zonesBlock}>
            <Text style={styles.zonesTitle}>Service zones</Text>
            <View style={styles.zoneChips}>
              {servant.zones.map((z: { id: number; name: string; city?: string }) => (
                <View key={z.id} style={styles.zoneChip}>
                  <MaterialIcons name="place" size={14} color={Stitch.colors.secondary} />
                  <Text style={styles.zoneChipText}>
                    {z.name}
                    {z.city ? ` · ${z.city}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </GlassCard>
      <GradientButton
        title="Book this helper"
        onPress={() =>
          router.push({
            pathname: '/(main)/bookings/new',
            params: { servantId: String(servant.id) },
          })
        }
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  back: { marginBottom: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  name: { fontSize: 24, fontWeight: '700' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  verifiedText: { color: Stitch.colors.success, fontWeight: '600' },
  skills: { marginTop: 8, color: Stitch.colors.onSurfaceVariant },
  rate: { marginTop: 8, fontWeight: '600', color: Stitch.colors.secondary },
  bio: { marginTop: 12, lineHeight: 22, color: Stitch.colors.onBackground },
  zonesBlock: { marginTop: 16 },
  zonesTitle: { fontSize: 14, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  zoneChipText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.primary },
});
