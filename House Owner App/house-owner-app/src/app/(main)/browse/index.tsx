import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSkills } from '@/hooks/useSkills';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';
import type { LocationValue } from '@/lib/locationTypes';

export default function BrowseScreen() {
  const { skill: skillParam } = useLocalSearchParams<{ skill?: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { location: liveLocation, loading: locLoading, error: locError } = useLiveLocation();
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const skillCodes = skills.map((s) => s.code);

  const searchLocation = useMemo<LocationValue | null>(() => {
    if (
      liveLocation?.latitude != null &&
      liveLocation?.longitude != null &&
      !Number.isNaN(liveLocation.latitude) &&
      !Number.isNaN(liveLocation.longitude)
    ) {
      return liveLocation;
    }
    const ho = user?.houseOwner;
    if (
      ho?.latitude != null &&
      ho?.longitude != null &&
      !Number.isNaN(ho.latitude) &&
      !Number.isNaN(ho.longitude)
    ) {
      return {
        address: ho.address || ho.city || 'Your saved home',
        city: ho.city,
        latitude: ho.latitude,
        longitude: ho.longitude,
      };
    }
    return null;
  }, [liveLocation, user?.houseOwner]);

  useEffect(() => {
    const raw = Array.isArray(skillParam) ? skillParam[0] : skillParam;
    const next = raw?.toUpperCase();
    if (next && skillCodes.includes(next)) {
      setSkill(next);
    }
  }, [skillParam, skillCodes.join(',')]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['servants', skill, city, zone, searchLocation?.latitude, searchLocation?.longitude],
    enabled: !locLoading && !!searchLocation,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        skill: skill || undefined,
        city: city || undefined,
        zone: zone || undefined,
        latitude: searchLocation!.latitude,
        longitude: searchLocation!.longitude,
      } as Record<string, string | number>;
      const res = await api.get('/servants', { params });
      return res.data.data.servants;
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Find verified help</Text>
        <Text style={styles.sub}>Helpers near your live location</Text>
      </View>
      {searchLocation ? (
        <View style={styles.liveLoc}>
          <MaterialIcons name="my-location" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.liveLocText} numberOfLines={2}>
            {searchLocation.address}
          </Text>
        </View>
      ) : locError || !locLoading ? (
        <Text style={styles.locError}>
          {locError || 'Set your home location in Profile to see helpers in your area'}
        </Text>
      ) : null}
      <TouchableOpacity
        style={styles.broadcastBtn}
        onPress={() =>
          router.push({
            pathname: '/(main)/bookings/request',
            params: skill ? { skill } : undefined,
          })
        }
      >
        <Text style={styles.broadcastTitle}>Request help in my area</Text>
        <Text style={styles.broadcastSub}>
          Notify all nearby verified helpers — first to accept gets the job
        </Text>
      </TouchableOpacity>
      <View style={styles.searchWrap}>
        <MaterialIcons name="location-city" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          style={styles.search}
          placeholder="City — Mumbai, Pune, Delhi…"
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          value={city}
          onChangeText={setCity}
        />
      </View>
      <View style={[styles.searchWrap, { marginTop: 0, marginBottom: 12 }]}>
        <MaterialIcons name="place" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          style={styles.search}
          placeholder="Zone — Bandra, Andheri, Koramangala…"
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          value={zone}
          onChangeText={setZone}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {skills.map((s) => (
          <TouchableOpacity
            key={s.code}
            style={[styles.chip, skill === s.code && styles.chipOn]}
            onPress={() => setSkill(skill === s.code ? '' : s.code)}
          >
            <Text style={[styles.chipText, skill === s.code && styles.chipTextOn]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={data || []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: { id: number; user: { name: string }; skills: { skillName: string }[]; rating: number; hourlyRate?: number; monthlyRate?: number; zones?: { name: string; city?: string }[] } }) => (
          <TouchableOpacity onPress={() => router.push(`/(main)/browse/${item.id}`)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.user.name[0]}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <View style={styles.verified}>
                    <MaterialIcons name="verified" size={14} color={Stitch.colors.success} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                  <Text style={styles.skills}>
                    {item.skills?.map((sk) => sk.skillName).join(' · ')}
                  </Text>
                  {item.zones?.length ? (
                    <Text style={styles.zones}>
                      {item.zones.map((z) => z.name).join(' · ')}
                    </Text>
                  ) : null}
                  <Text style={styles.rate}>
                    ★ {item.rating.toFixed(1)} · {Stitch.copy.rupee}
                    {item.hourlyRate || '—'}/hr · {Stitch.copy.rupee}
                    {item.monthlyRate || '—'}/mo
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Stitch.colors.secondary} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading || locLoading
              ? 'Loading…'
              : !searchLocation
                ? 'Enable location or set your home address in Profile'
                : 'No verified helpers in your area yet — try Request help in my area'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  header: { paddingTop: 56, paddingHorizontal: Stitch.spacing.padding, paddingBottom: 8 },
  title: { ...Stitch.typography.headline, fontSize: 26, color: Stitch.colors.primary },
  sub: { ...Stitch.typography.caption, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  liveLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
    padding: 12,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.surfaceLow,
  },
  liveLocText: { flex: 1, fontSize: 13, color: Stitch.colors.onSurfaceVariant },
  locError: {
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
    fontSize: 13,
    color: Stitch.colors.error,
  },
  broadcastBtn: {
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 16,
    padding: 16,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.secondary,
  },
  broadcastTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  broadcastSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Stitch.spacing.padding,
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  search: { flex: 1, marginLeft: 8, fontSize: 16 },
  chips: { paddingHorizontal: Stitch.spacing.padding, marginBottom: 12, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
    marginRight: 8,
  },
  chipOn: { backgroundColor: Stitch.colors.secondary },
  chipText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  chipTextOn: { color: '#fff' },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: Stitch.colors.primary },
  cardBody: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 11, color: Stitch.colors.success, fontWeight: '600' },
  skills: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  zones: { fontSize: 12, color: Stitch.colors.primary, marginTop: 4, fontWeight: '500' },
  rate: { fontSize: 14, color: Stitch.colors.secondary, fontWeight: '600', marginTop: 6 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant, marginTop: 40 },
});
