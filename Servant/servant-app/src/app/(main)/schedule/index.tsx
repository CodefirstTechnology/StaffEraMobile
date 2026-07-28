import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { splitServantJobs } from '@/lib/bookingVisibility';
import { showsHouseOwnerContact } from '@/lib/bookingContact';
import { getBookingDisplayAmount, isFinalBookingPrice } from '@/lib/bookingPricing';
import { formatCurrency } from '@/lib/i18n/format';
import { HouseOwnerContactCard } from '@/components/bookings/HouseOwnerContactCard';

type ScheduleBooking = {
  id: number;
  status: string;
  bookingType: string;
  address?: string;
  sessionDate?: string | null;
  updatedAt?: string;
  totalAmount?: number | null;
  finalAmount?: number | null;
  sessionHours?: number | null;
  timeEntries?: { hoursWorked?: number | null }[];
  houseOwner: { user: { name: string; phone?: string | null } };
};

function ScheduleJobCard({ booking }: { booking: ScheduleBooking }) {
  const { t } = useTranslation();
  const displayAmount = getBookingDisplayAmount(booking);
  const showFinalPrice = isFinalBookingPrice(booking.status);

  return (
    <Pressable onPress={() => router.push(`/(main)/schedule/${booking.id}`)}>
      <GlassCard style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{booking.houseOwner.user.name}</Text>
            <Text style={styles.meta}>
              {booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly')} ·{' '}
              {booking.address || t('schedule.addressTbd')}
            </Text>
            {displayAmount != null ? (
              <Text style={styles.amount}>
                {showFinalPrice
                  ? t('bookings.finalPrice', {
                      amount: `${t('common.rupee')}${formatCurrency(displayAmount)}`,
                    })
                  : `${t('common.rupee')}${formatCurrency(displayAmount)}`}
              </Text>
            ) : null}
            {showsHouseOwnerContact(booking.status) ? (
              <HouseOwnerContactCard compact phone={booking.houseOwner.user.phone} />
            ) : null}
            <StatusPill status={booking.status} />
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bookings'],
    enabled: isAuthenticated,
    staleTime: 5000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as ScheduleBooking[];
    },
  });

  const { active: activeJobs, completed: completedJobs } = splitServantJobs(data || []);
  const hasJobs = activeJobs.length > 0 || completedJobs.length > 0;
  const showLoader = isLoading && !hasJobs;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          tintColor={Stitch.colors.primary}
        />
      }
    >
      <Text style={styles.title}>{t('schedule.title')}</Text>
      {showLoader ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Stitch.colors.primary} />
          <Text style={styles.empty}>{t('common.loading')}</Text>
        </View>
      ) : !hasJobs ? (
        <GlassCard>
          <Text style={styles.empty}>{t('schedule.emptyCalendar')}</Text>
        </GlassCard>
      ) : (
        <>
          <Text style={styles.section}>{t('schedule.activeJobs')}</Text>
          {activeJobs.length === 0 ? (
            <GlassCard style={styles.sectionEmptyCard}>
              <Text style={styles.empty}>{t('schedule.noActiveJobs')}</Text>
            </GlassCard>
          ) : (
            activeJobs.map((b) => <ScheduleJobCard key={b.id} booking={b} />)
          )}

          <Text style={styles.section}>{t('schedule.completedJobs')}</Text>
          {completedJobs.length === 0 ? (
            <GlassCard style={styles.sectionEmptyCard}>
              <Text style={styles.empty}>{t('schedule.noCompletedJobs')}</Text>
            </GlassCard>
          ) : (
            completedJobs.map((b) => <ScheduleJobCard key={`done-${b.id}`} booking={b} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
    marginBottom: 12,
    marginTop: 8,
  },
  card: { marginBottom: 12 },
  sectionEmptyCard: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { color: Stitch.colors.onSurfaceVariant, marginVertical: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: Stitch.colors.secondary, marginBottom: 6 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
  loader: { alignItems: 'center', paddingVertical: 32, gap: 12 },
});
