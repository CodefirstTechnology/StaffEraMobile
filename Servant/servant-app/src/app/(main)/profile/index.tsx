import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';

type Zone = { id: number; name: string; city?: string | null };

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['servant-profile'],
    queryFn: async () => {
      const res = await api.get('/servants/me');
      return res.data.data.servant;
    },
  });

  const zones: Zone[] = profile?.zones || user?.servant?.zones || [];

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Profile</Text>
      <GlassCard>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        <Text style={styles.status}>
          Verification: {profile?.verificationStatus || user?.servant?.verificationStatus || 'PENDING'}
        </Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </GlassCard>

      <GlassCard style={{ marginTop: 16 }}>
        <View style={styles.zoneHeader}>
          <Text style={styles.sectionTitle}>Service zones</Text>
          <TouchableOpacity onPress={() => router.push('/(main)/zones')}>
            <Text style={styles.manageLink}>Manage</Text>
          </TouchableOpacity>
        </View>
        {zones.length === 0 ? (
          <Text style={styles.zoneEmpty}>No zones added yet.</Text>
        ) : (
          <View style={styles.zoneChips}>
            {zones.map((z) => (
              <View key={z.id} style={styles.chip}>
                <MaterialIcons name="place" size={14} color={Stitch.colors.secondary} />
                <Text style={styles.chipText}>
                  {z.name}
                  {z.city ? ` · ${z.city}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.zoneBtn}
          onPress={() => router.push('/(main)/zones')}
        >
          <MaterialIcons name="add-location-alt" size={20} color={Stitch.colors.primary} />
          <Text style={styles.zoneBtnText}>Servant Zone</Text>
          <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </GlassCard>

      <GradientButton title="Sign out" variant="outline" onPress={signOut} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: Stitch.colors.onSurfaceVariant, marginTop: 6 },
  meta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  status: { marginTop: 8, color: Stitch.colors.secondary, fontWeight: '600' },
  bio: { marginTop: 10, lineHeight: 20, color: Stitch.colors.onBackground },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  manageLink: { color: Stitch.colors.secondary, fontWeight: '600', fontSize: 14 },
  zoneEmpty: { color: Stitch.colors.onSurfaceVariant, marginTop: 8, fontSize: 14 },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.primary },
  zoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Stitch.colors.outlineVariant,
    gap: 8,
  },
  zoneBtnText: { flex: 1, fontWeight: '600', fontSize: 15 },
});
