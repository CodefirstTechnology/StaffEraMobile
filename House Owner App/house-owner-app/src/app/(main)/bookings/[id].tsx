import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { BackHeader } from '@/components/ui/BackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { useBookingTrackingPoll } from '@/hooks/useBookingTrackingPoll';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { localizedSkillLabel } from '@/lib/skills';
import { useSkills } from '@/hooks/useSkills';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { getBookingDisplayAmount, isFinalBookingPrice } from '@/lib/bookingPricing';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { BookingWorkTimesCard } from '@/components/bookings/BookingWorkTimesCard';
import { getBookingEditMode } from '@/lib/bookingEdit';
import { bookingDetailPollInterval } from '@/lib/bookingPoll';
import { getHelperContact, showsHelperContact, allowsContactActions } from '@/lib/bookingContact';
import { HelperContactCard } from '@/components/bookings/HelperContactCard';
import { useNotifications } from '@/hooks/useNotifications';

export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const { data: skills = [] } = useSkills();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();
  useNotifications();

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
    refetchInterval: (query) => bookingDetailPollInterval(query.state.data),
  });

  useFocusEffect(
    useCallback(() => {
      if (id) void refetch();
    }, [id, refetch]),
  );

  const isOpenBroadcast = booking?.status === 'PENDING' && !booking?.servant;

  const { data: areaHelpers = [] } = useQuery({
    queryKey: [
      'servants',
      booking?.requestedSkill,
      booking?.latitude,
      booking?.longitude,
    ],
    enabled:
      isOpenBroadcast &&
      booking?.latitude != null &&
      booking?.longitude != null,
    queryFn: async () => {
      const res = await api.get('/servants', {
        params: {
          skill: booking!.requestedSkill || undefined,
          latitude: booking!.latitude,
          longitude: booking!.longitude,
        },
      });
      return res.data.data.servants as { user: { name: string } }[];
    },
  });

  const trackLive = booking?.status === 'CONFIRMED';
  const { data: tracking } = useBookingTrackingPoll(bookingId, trackLive);

  const home =
    booking?.latitude != null && booking?.longitude != null
      ? { latitude: booking.latitude, longitude: booking.longitude }
      : null;

  const servant = tracking?.servant
    ? { latitude: tracking.servant.latitude, longitude: tracking.servant.longitude }
    : null;
  const helperSharing = Boolean(servant);
  const canTrack = trackLive && home;

  const cancel = async () => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['home-summary'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      showAlert(t('bookings.cancelledTitle'), t('bookings.bookingCancelled'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showAlert(t('bookings.requestFailed'), err.response?.data?.message || t('bookings.couldNotCancel'));
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.root}>
        <BackHeader title={t('bookings.bookingDetails')} />
        <View style={styles.center}>
          <Text style={styles.muted}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  const statusHint: Record<string, string> = {
    PENDING: booking.servant
      ? t('bookings.hintPendingServant')
      : areaHelpers.length > 0
        ? t('bookings.hintPendingBroadcast', { count: areaHelpers.length })
        : t('bookings.hintPendingOpen'),
    CONFIRMED: helperSharing
      ? t('bookings.hintConfirmedSharing', {
          name: booking.servant?.user?.name || t('common.helper'),
        })
      : t('bookings.hintConfirmedNoShare'),
    ACTIVE: helperSharing ? t('bookings.hintActiveSharing') : t('bookings.hintActiveNoShare'),
    REJECTED: t('bookings.hintRejected'),
    CANCELLED: t('bookings.hintCancelled'),
    EXPIRED: t('bookings.hintExpired'),
    COMPLETED: t('bookings.hintCompleted'),
  };

  const slotLabel = formatSessionSlotsLabel(
    booking.sessionSlots,
    booking.sessionStartTime,
    booking.sessionEndTime,
  );
  const visitDate = booking.sessionDate ? formatDate(booking.sessionDate) : null;
  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');
  const editMode = getBookingEditMode(booking.status);
  const helperContact = getHelperContact(booking);

  return (
    <View style={styles.root}>
      <BackHeader title={t('bookings.bookingDetails')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <GlassCard>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {booking.servant?.user?.name || t('bookings.findingHelper')}
          </Text>
          {booking.servant &&
          (booking.servant.verificationStatus === 'VERIFIED' || !booking.servant.verificationStatus) ? (
            <VerifiedBadge size="md" />
          ) : null}
        </View>
        <StatusPill status={booking.status} />
        <Text style={styles.hint}>{statusHint[booking.status] || ''}</Text>
        {helperContact ? (
          <HelperContactCard
            name={helperContact.name}
            phone={helperContact.phone}
            email={helperContact.email}
            bio={helperContact.bio}
            rating={helperContact.rating}
            verificationStatus={helperContact.verificationStatus}
            showActions={allowsContactActions(booking.status)}
          />
        ) : booking.servant?.user?.name && !showsHelperContact(booking.status) ? (
          <Text style={styles.pendingHelper}>
            {t('bookings.waitingHelperAccept', { name: booking.servant.user.name })}
          </Text>
        ) : null}
        <Text style={styles.row}>{t('bookings.typeLabel', { type: visitType })}</Text>
        {booking.requestedSkill ? (
          <Text style={styles.row}>
            {t('bookings.categoryRow', {
              category: localizedSkillLabel(booking.requestedSkill, skills),
            })}
          </Text>
        ) : null}
        {visitDate && slotLabel ? (
          <Text style={styles.row}>
            {t('bookings.timeSlotsRow', { date: visitDate, slots: slotLabel })}
          </Text>
        ) : slotLabel ? (
          <Text style={styles.row}>{t('bookings.timeSlotRow', { slots: slotLabel })}</Text>
        ) : null}
        {formatVisitAddressLines(booking).length > 0 ? (
          <VisitAddressBanner parts={booking} />
        ) : booking.address ? (
          <Text style={styles.row}>
            {t('bookings.addressRow', { address: booking.address })}
          </Text>
        ) : null}
        {(() => {
          const displayAmount = getBookingDisplayAmount(booking);
          if (displayAmount == null) return null;
          const showFinalPrice = isFinalBookingPrice(booking.status);
          return (
            <Text style={styles.amount}>
              {showFinalPrice
                ? t('bookings.finalPrice', {
                    amount: `${Stitch.copy.rupee}${formatCurrency(displayAmount)}`,
                  })
                : `${Stitch.copy.rupee}${formatCurrency(displayAmount)}`}
            </Text>
          );
        })()}
        {booking.notes ? (
          <Text style={styles.row}>{t('bookings.notesRow', { notes: booking.notes })}</Text>
        ) : null}
      </GlassCard>

      <BookingWorkTimesCard booking={booking} style={{ marginTop: 16 }} />

      {helperSharing && canTrack && booking.status === 'CONFIRMED' ? (
        <View style={styles.onWayBanner}>
          <MaterialIcons name="directions-car" size={22} color={Stitch.colors.success} />
          <View style={styles.onWayTextWrap}>
            <Text style={styles.onWayTitle}>{t('bookings.helperOnWay')}</Text>
            <Text style={styles.onWaySub}>{t('bookings.helperOnWaySub')}</Text>
          </View>
        </View>
      ) : null}

      {canTrack ? (
        <JobTrackingMap
          home={home}
          servant={servant}
          lastUpdated={tracking?.servant?.updatedAt ?? null}
          visitAddress={{
            flatNo: booking.flatNo,
            building: booking.building,
            area: booking.area,
            address: booking.address,
          }}
        />
      ) : trackLive && !home ? (
        <GlassCard style={styles.noMap}>
          <Text style={styles.noMapText}>{t('bookings.addAddressForMap')}</Text>
        </GlassCard>
      ) : null}

      {booking.bookingType === 'SESSION' && ['CONFIRMED', 'ACTIVE'].includes(booking.status) && (
        <View style={styles.extensionContainer}>
          {!booking.extensionStatus && (
            <GradientButton
              title="Extend Booking by 15 mins"
              onPress={async () => {
                try {
                  await api.patch(`/bookings/${id}/request-extension`);
                  qc.invalidateQueries({ queryKey: ['booking', id] });
                  showAlert("Success", "Extension requested. Waiting for helper's approval.");
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } };
                  showAlert("Failed to extend", err.response?.data?.message || "Could not request extension.");
                }
              }}
              style={{ marginTop: 12 }}
            />
          )}

          {booking.extensionStatus === 'PENDING' && (
            <GlassCard style={styles.infoBanner}>
              <MaterialIcons name="hourglass-empty" size={20} color={Stitch.colors.secondary} />
              <Text style={styles.infoBannerText}>
                Extension requested. Waiting for helper's approval. (New end time: {booking.extensionRequestedEndTime})
              </Text>
            </GlassCard>
          )}

          {booking.extensionStatus === 'ACCEPTED' && (
            <GlassCard style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={20} color={Stitch.colors.success} />
              <Text style={styles.successBannerText}>
                Extension accepted! New end time: {booking.sessionEndTime}
              </Text>
            </GlassCard>
          )}

          {booking.extensionStatus === 'REJECTED' && (
            <GlassCard style={styles.errorBanner}>
              <MaterialIcons name="cancel" size={20} color={Stitch.colors.error} />
              <Text style={styles.errorBannerText}>
                Extension request was declined by the helper.
              </Text>
            </GlassCard>
          )}
        </View>
      )}
      {editMode !== 'none' ? (
        <GradientButton
          title={t('bookings.editBooking')}
          onPress={() => router.push(`/(main)/bookings/edit/${id}`)}
          style={{ marginTop: 20 }}
        />
      ) : null}

      {['PENDING', 'CONFIRMED'].includes(booking.status) && (
        <GradientButton
          title={t('bookings.cancelBooking')}
          variant="outline"
          onPress={cancel}
          style={{ marginTop: 20 }}
        />
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Stitch.spacing.padding, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  name: { fontSize: 22, fontWeight: '700' },
  hint: { marginTop: 12, color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  pendingHelper: {
    marginTop: 12,
    fontSize: 14,
    color: Stitch.colors.secondary,
    fontWeight: '600',
    lineHeight: 20,
  },
  row: { marginTop: 8, color: Stitch.colors.onBackground },
  helpers: { marginTop: 10, fontSize: 13, color: Stitch.colors.secondary, lineHeight: 18 },
  amount: { marginTop: 12, fontSize: 20, fontWeight: '700', color: Stitch.colors.secondary },
  onWayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.successBg,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  onWayTextWrap: { flex: 1 },
  onWayTitle: { fontSize: 15, fontWeight: '700', color: Stitch.colors.success },
  onWaySub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  noMap: { marginTop: 16 },
  noMapText: { color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  extensionContainer: {
    marginTop: 16,
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Stitch.colors.surfaceLow,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Stitch.colors.successBg,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  successBannerText: {
    flex: 1,
    fontSize: 14,
    color: Stitch.colors.success,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Stitch.colors.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: Stitch.colors.error,
    fontWeight: '600',
  },
});
