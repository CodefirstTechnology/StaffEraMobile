import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { BackHeader } from '@/components/ui/BackHeader';
import { GradientButton } from '@/components/ui/GradientButton';
import { localizedSkillLabel } from '@/lib/skills';
import { formatCurrency } from '@/lib/i18n/format';
import { useSkills } from '@/hooks/useSkills';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';

export default function ServantDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { location: liveLocation } = useLiveLocation();

  const searchLocation = useMemo(() => {
    if (liveLocation?.latitude != null && liveLocation?.longitude != null) {
      return liveLocation;
    }
    const ho = user?.houseOwner;
    if (ho?.latitude != null && ho?.longitude != null) {
      return { latitude: ho.latitude, longitude: ho.longitude };
    }
    return null;
  }, [liveLocation, user?.houseOwner]);

  const { data: servant, isLoading, error } = useQuery({
    queryKey: ['servant', id, searchLocation?.latitude, searchLocation?.longitude],
    enabled: !!id,
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (searchLocation) {
        params.latitude = searchLocation.latitude;
        params.longitude = searchLocation.longitude;
      }
      const res = await api.get(`/servants/${id}`, { params });
      return res.data.data.servant;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.root}>
        <BackHeader />
        <View style={styles.center}>
          <Text style={styles.muted}>{t('browse.loadingProfile')}</Text>
        </View>
      </View>
    );
  }

  if (error || !servant) {
    return (
      <View style={styles.root}>
        <BackHeader />
        <View style={styles.center}>
          <Text style={styles.muted}>{t('browse.helperNotInArea')}</Text>
        </View>
      </View>
    );
  }

  const [selectedBookingType, setSelectedBookingType] = useState<'SESSION' | 'MONTHLY'>('SESSION');
  const [selectedHours, setSelectedHours] = useState(4);

  const { data: pricingConfig } = useQuery({
    queryKey: ['pricingConfig'],
    queryFn: async () => {
      const res = await api.get('/pricing/config');
      return res.data.data.pricing;
    },
  });

  const feePct = pricingConfig?.platformFeePercentage ?? 10;
  const baseSubtotal =
    selectedBookingType === 'SESSION'
      ? (servant.hourlyRate || 0) * selectedHours
      : servant.monthlyRate || 0;

  const platformFee = Math.round(baseSubtotal * (feePct / 100) * 100) / 100;
  const totalCharge = Math.round((baseSubtotal + platformFee) * 100) / 100;

  return (
    <View style={styles.root}>
      <BackHeader title={servant.user.name} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <GlassCard>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{servant.user.name[0]}</Text>
        </View>
        <Text style={styles.name}>{servant.user.name}</Text>
        <View style={styles.verified}>
          <MaterialIcons name="verified" size={16} color={Stitch.colors.success} />
          <Text style={styles.verifiedText}>{t('browse.agentVerified')}</Text>
        </View>
        <Text style={styles.skills}>
          {servant.skills
            ?.map((s: { skillName: string }) => localizedSkillLabel(s.skillName, skills))
            .join(' · ')}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeTitle}>Hourly Rate</Text>
            <Text style={styles.rateBadgeValue}>
              {Stitch.copy.rupee}{servant.hourlyRate ? formatCurrency(servant.hourlyRate) : '—'}/hr
            </Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeTitle}>Monthly Contract</Text>
            <Text style={styles.rateBadgeValue}>
              {Stitch.copy.rupee}{servant.monthlyRate ? formatCurrency(servant.monthlyRate) : '—'}/mo
            </Text>
          </View>
        </View>
        {servant.bio ? <Text style={styles.bio}>{servant.bio}</Text> : null}
        {servant.zones?.length > 0 ? (
          <View style={styles.zonesBlock}>
            <Text style={styles.zonesTitle}>{t('browse.serviceZones')}</Text>
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

      {/* Service Charges Breakdown Card */}
      <View style={styles.pricingCard}>
        <Text style={styles.pricingCardTitle}>Service Charge Estimator</Text>
        
        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, selectedBookingType === 'SESSION' && styles.typeTabActive]}
            onPress={() => setSelectedBookingType('SESSION')}
          >
            <Text style={[styles.typeTabText, selectedBookingType === 'SESSION' && styles.typeTabTextActive]}>
              Session Visit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTab, selectedBookingType === 'MONTHLY' && styles.typeTabActive]}
            onPress={() => setSelectedBookingType('MONTHLY')}
          >
            <Text style={[styles.typeTabText, selectedBookingType === 'MONTHLY' && styles.typeTabTextActive]}>
              Monthly Contract
            </Text>
          </TouchableOpacity>
        </View>

        {selectedBookingType === 'SESSION' && (
          <View style={styles.hoursRow}>
            <Text style={styles.hoursLabel}>Duration:</Text>
            {[1, 2, 4, 8].map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.hourChip, selectedHours === h && styles.hourChipActive]}
                onPress={() => setSelectedHours(h)}
              >
                <Text style={[styles.hourChipText, selectedHours === h && styles.hourChipTextActive]}>
                  {h} hr{h > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.breakdownBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Helper Charge ({selectedBookingType === 'SESSION' ? `${selectedHours} hrs × ${Stitch.copy.rupee}${servant.hourlyRate || 0}` : `1 mo × ${Stitch.copy.rupee}${servant.monthlyRate || 0}`})
            </Text>
            <Text style={styles.breakdownValue}>{Stitch.copy.rupee}{formatCurrency(baseSubtotal)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Service & Support Fee ({feePct}%)</Text>
            <Text style={styles.breakdownFee}>+{Stitch.copy.rupee}{formatCurrency(platformFee)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
            <Text style={styles.breakdownTotalLabel}>Total Service Charge</Text>
            <Text style={styles.breakdownTotalValue}>{Stitch.copy.rupee}{formatCurrency(totalCharge)}</Text>
          </View>
        </View>
      </View>

      <GradientButton
        title={t('browse.bookHelper')}
        onPress={() =>
          router.push({
            pathname: '/(main)/bookings/new',
            params: { servantId: String(servant.id) },
          })
        }
        style={{ marginTop: 16 }}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Stitch.spacing.padding, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Stitch.spacing.padding },
  muted: { color: Stitch.colors.onSurfaceVariant, textAlign: 'center' },
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
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rateBadge: {
    flex: 1,
    backgroundColor: Stitch.colors.surfaceContainer,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  rateBadgeTitle: { fontSize: 11, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  rateBadgeValue: { fontSize: 15, fontWeight: '700', color: Stitch.colors.primary, marginTop: 2 },
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
  pricingCard: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pricingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 12,
  },
  typeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
  },
  typeTabActive: { backgroundColor: Stitch.colors.secondary },
  typeTabText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  typeTabTextActive: { color: '#fff' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  hoursLabel: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  hourChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Stitch.colors.surfaceContainer,
  },
  hourChipActive: { backgroundColor: Stitch.colors.primary },
  hourChipText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  hourChipTextActive: { color: '#fff' },
  breakdownBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: { fontSize: 12, color: Stitch.colors.onSurfaceVariant },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onBackground },
  breakdownFee: { fontSize: 13, fontWeight: '600', color: Stitch.colors.secondary },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '700', color: Stitch.colors.primary },
  breakdownTotalValue: { fontSize: 16, fontWeight: '800', color: Stitch.colors.secondary },
});
