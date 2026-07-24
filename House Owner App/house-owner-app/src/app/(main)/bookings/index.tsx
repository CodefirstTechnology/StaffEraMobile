import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useSkills } from '@/hooks/useSkills';
import {
  BookingSummaryCard,
  splitBookings,
  type BookingSummary,
} from '@/components/bookings/BookingSummaryCard';
import { bookingsListPollInterval } from '@/lib/bookingPoll';

export default function BookingsListScreen() {
  const { t } = useTranslation();
  const { data: skills = [] } = useSkills();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bookings', page, limit],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { page, limit } });
      return {
        bookings: res.data.data.bookings as BookingSummary[],
        total: (res.data.data.pagination?.total ?? res.data.data.bookings.length) as number,
      };
    },
    refetchInterval: (query) =>
      bookingsListPollInterval(
        (query.state.data as { bookings: BookingSummary[] } | undefined)?.bookings,
      ),
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const bookings = data?.bookings || [];
  const total = data?.total || 0;
  const { active, recent } = splitBookings(bookings);

  const sections = useMemo(
    () =>
      [
        { key: 'active', title: t('common.active'), data: active },
        { key: 'recent', title: t('common.recent'), data: recent },
      ].filter((section) => section.data.length > 0),
    [active, recent, t],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('bookings.myBookings')}</Text>
        <Text style={styles.sub}>
          {bookings.length > 0
            ? t('bookings.totalCount', { count: bookings.length })
            : t('bookings.activeAndRecent')}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.list,
          bookings.length === 0 && !isLoading ? styles.listEmpty : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={Stitch.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <GlassCard style={styles.emptyCard}>
              <MaterialIcons name="event-busy" size={40} color={Stitch.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>{t('bookings.noBookingsTitle')}</Text>
              <Text style={styles.emptySub}>{t('bookings.noBookingsSub')}</Text>
              <GradientButton
                title={t('bookings.sendRequest')}
                onPress={() => router.push('/(main)/bookings/request')}
                style={styles.emptyBtn}
              />
            </GlassCard>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <BookingSummaryCard
            booking={item}
            skills={skills}
            onPress={() => router.push(`/(main)/bookings/${item.id}`)}
          />
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ListFooterComponent={
          bookings.length > 0 ? (
            <PaginationControls
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
  },
  sectionGap: { height: 16 },
  emptyCard: { alignItems: 'center', marginTop: 24, paddingVertical: 28 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
    marginTop: 12,
  },
  emptySub: {
    textAlign: 'center',
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyBtn: { alignSelf: 'stretch' },
});
