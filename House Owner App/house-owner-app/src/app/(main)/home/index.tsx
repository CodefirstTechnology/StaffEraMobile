import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { useSkills } from '@/hooks/useSkills';
import { useNotifications } from '@/hooks/useNotifications';

const SKILL_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CLEANING: 'cleaning-services',
  COOKING: 'restaurant',
  CHILDCARE: 'child-care',
  ELDERLY_CARE: 'elderly',
  LAUNDRY: 'local-laundry-service',
  DRIVING: 'drive-eta',
  GARDENING: 'yard',
};

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { data: notifications = [] } = useNotifications();
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings;
    },
    refetchInterval: 20000,
  });

  const upcoming = (bookings || [])
    .filter((b: { status: string }) => ['CONFIRMED', 'ACTIVE', 'PENDING'].includes(b.status))
    .slice(0, 3);

  return (
    <View style={styles.root}>
      <ScreenHeader
        location={
          user?.houseOwner?.address
            ? user.houseOwner.address.split(',').slice(0, 2).join(',').trim()
            : user?.houseOwner?.city || 'Set your home location in Profile'
        }
        unreadNotifications={unreadNotifications}
        onNotifications={() => router.push('/(main)/notifications')}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={22} color={Stitch.colors.onSurfaceVariant} />
          <TextInput
            placeholder="Search verified help — cooking, cleaning…"
            placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
            style={styles.search}
          />
        </View>

        <LinearGradient
          colors={[Stitch.colors.secondary, Stitch.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Welcome offer</Text>
          </View>
          <Text style={styles.heroTitle}>Book verified help</Text>
          <Text style={styles.heroSub}>Background-checked staff for your home</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(main)/browse')}>
            <Text style={styles.heroBtnText}>Browse now</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Explore services</Text>
        <View style={styles.grid}>
          {skills.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={styles.cat}
              onPress={() =>
                router.push({ pathname: '/(main)/browse', params: { skill: c.code } })
              }
            >
              <View style={styles.catIcon}>
                <MaterialIcons
                  name={SKILL_ICONS[c.code] || 'handyman'}
                  size={28}
                  color={Stitch.colors.primary}
                />
              </View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Upcoming visits</Text>
        {upcoming.length === 0 ? (
          <GlassCard>
            <Text style={styles.empty}>No bookings yet — find help in Browse</Text>
          </GlassCard>
        ) : (
          upcoming.map((b: { id: number; status: string; servant: { user: { name: string } } | null; bookingType: string }) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/(main)/bookings/${b.id}`)}
            >
              <GlassCard style={styles.bookingCard}>
                <Text style={styles.bookingName}>
                  {b.servant?.user?.name || 'Finding nearby helper…'}
                </Text>
                <Text style={styles.bookingMeta}>{b.bookingType}</Text>
                <StatusPill status={b.status} />
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  search: { flex: 1, marginLeft: 8, fontSize: 16, color: Stitch.colors.onBackground },
  hero: {
    borderRadius: Stitch.radius.xl,
    padding: 24,
    marginBottom: 28,
    shadowColor: Stitch.colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
    marginBottom: 10,
  },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 16 },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Stitch.radius.lg,
  },
  heroBtnText: { color: Stitch.colors.secondary, fontWeight: '700' },
  sectionTitle: {
    ...Stitch.typography.headline,
    fontSize: 20,
    color: Stitch.colors.onBackground,
    marginBottom: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  cat: { width: '30%', alignItems: 'center', marginBottom: 8 },
  catIcon: {
    width: 64,
    height: 64,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Stitch.colors.primaryContainer,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  catLabel: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  bookingCard: { marginBottom: 12 },
  bookingName: { fontSize: 17, fontWeight: '600', color: Stitch.colors.onBackground },
  bookingMeta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4, marginBottom: 8 },
  empty: { color: Stitch.colors.onSurfaceVariant, textAlign: 'center' },
});
