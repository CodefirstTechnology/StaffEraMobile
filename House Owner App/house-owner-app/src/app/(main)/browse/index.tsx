import { useEffect, useState } from 'react';
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

export default function BrowseScreen() {
  const { skill: skillParam } = useLocalSearchParams<{ skill?: string }>();
  const { data: skills = [] } = useSkills();
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const skillCodes = skills.map((s) => s.code);

  useEffect(() => {
    const raw = Array.isArray(skillParam) ? skillParam[0] : skillParam;
    const next = raw?.toUpperCase();
    if (next && skillCodes.includes(next)) {
      setSkill(next);
    }
  }, [skillParam, skillCodes.join(',')]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['servants', skill, city, zone],
    queryFn: async () => {
      const res = await api.get('/servants', {
        params: {
          skill: skill || undefined,
          city: city || undefined,
          zone: zone || undefined,
        },
      });
      return res.data.data.servants;
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Find verified help</Text>
        <Text style={styles.sub}>All staff are agent-verified</Text>
      </View>
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
          <Text style={styles.empty}>{isLoading ? 'Loading…' : 'No helpers in this area yet'}</Text>
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
