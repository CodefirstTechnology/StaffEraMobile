import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { LocationMapPreview } from '@/components/ui/LocationMapPreview';
import { GradientButton } from '@/components/ui/GradientButton';
import { useToast } from '@/providers/ToastProvider';
import { useServantLocationReporter } from '@/hooks/useServantLocationReporter';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import {
  stopPendingRequestVibration,
  syncPendingRequestVibration,
  vibrateBookingAccepted,
} from '@/lib/bookingRequestVibration';
import { WorkStartOtpPanel } from '@/components/bookings/WorkStartOtpPanel';
import { DeclineReasonSheet } from '@/components/bookings/DeclineReasonSheet';
import { ZoneRequiredBanner } from '@/components/zones/ZoneRequiredBanner';
import { useZoneGate } from '@/hooks/useZoneGate';
import { useDeclinedOpenBookingIds, isDeclinedOpenBooking } from '@/hooks/useDeclinedOpenBookingIds';
import { isActionableBooking, isCancelled } from '@/lib/bookingVisibility';
import { declineBooking } from '@/lib/declineBooking';

export default function ScheduleDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();
  const [sharingLocation, setSharingLocation] = useState(false);
  const [acting, setActing] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const { hasZones, requireZone, goAddZone } = useZoneGate();
  const actionsBlocked = !hasZones;
  const { data: declinedOpenIds = [] } = useDeclinedOpenBookingIds();

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status as string | undefined;
      return status && isActionableBooking(status) ? 2000 : false;
    },
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
  });

  useEffect(() => {
    if (!isError || bookingId == null) return;
    if (isDeclinedOpenBooking(bookingId, declinedOpenIds)) {
      router.back();
    }
  }, [isError, bookingId, declinedOpenIds]);

  const { data: today } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data;
    },
  });

  const openEntry = today?.entries?.find((e: { clockOut: string | null }) => !e.clockOut);
  const clockedInHere = openEntry?.bookingId === bookingId;
  const bookingCancelled = booking ? isCancelled(booking.status) : false;
  const bookingActionable = booking ? isActionableBooking(booking.status) : false;
  const trackEnabled =
    !bookingCancelled &&
    bookingId != null &&
    (clockedInHere || (sharingLocation && booking?.status === 'CONFIRMED'));

  useServantLocationReporter(bookingId, trackEnabled);

  const apiError = (e: unknown, fallback: string) => {
    const err = e as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  };

  const resumePendingVibrationIfNeeded = () => {
    const open = qc.getQueryData(['open-requests']) as { status: string }[] | undefined;
    const all = qc.getQueryData(['bookings']) as { status: string }[] | undefined;
    const stillPending =
      (open?.length ?? 0) + (all?.filter((b) => b.status === 'PENDING').length ?? 0) > 0;
    syncPendingRequestVibration(stillPending);
  };

  const confirm = async () => {
    if (acting) return;
    if (!requireZone()) return;
    setActing(true);
    stopPendingRequestVibration();
    try {
      await api.patch(`/bookings/${id}/confirm`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['open-requests'] }),
        qc.invalidateQueries({ queryKey: ['schedule'] }),
      ]);
      await vibrateBookingAccepted();
      Alert.alert(t('servantHome.acceptedTitle'), t('servantHome.customerNotified'));
    } catch (e: unknown) {
      Alert.alert(t('servantHome.couldNotAccept'), apiError(e, t('auth.tryAgain')));
      resumePendingVibrationIfNeeded();
    } finally {
      setActing(false);
    }
  };

  const openDecline = () => {
    if (acting) return;
    const isOpenRequest = booking?.servantId == null;
    if (!isOpenRequest && !requireZone()) return;
    setDeclineOpen(true);
  };

  const submitDecline = async (reason: string) => {
    if (acting || bookingId == null) return;
    const wasOpenRequest = booking?.servantId == null;
    setDeclineLoading(true);
    setActing(true);
    try {
      await declineBooking(bookingId, reason, wasOpenRequest);

      if (wasOpenRequest) {
        qc.setQueryData(['open-requests'], (prev: { id: number }[] | undefined) =>
          (prev ?? []).filter((row) => row.id !== bookingId),
        );
        qc.setQueryData<number[]>(['declined-open-booking-ids'], (prev) =>
          Array.from(new Set([...(prev ?? []), bookingId])),
        );
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['open-requests'] }),
        qc.invalidateQueries({ queryKey: ['declined-open-booking-ids'] }),
        qc.invalidateQueries({ queryKey: ['schedule'] }),
      ]);
      setDeclineOpen(false);
      Alert.alert(
        t('servantHome.declinedTitle'),
        wasOpenRequest ? t('servantHome.openRequestPassed') : t('servantHome.customerNotified'),
      );
      if (wasOpenRequest) {
        router.back();
      }
    } catch (e: unknown) {
      Alert.alert(t('servantHome.couldNotDecline'), apiError(e, t('auth.tryAgain')));
    } finally {
      setDeclineLoading(false);
      setActing(false);
    }
  };

  const markArrived = async () => {
    if (!requireZone()) return;
    try {
      await api.patch(`/bookings/${id}/arrived`);
      setSharingLocation(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
      toast.info(t('workOtp.requestedBody'));
    } catch (e: unknown) {
      Alert.alert(t('servantHome.couldNotStart'), apiError(e, t('servantHome.checkConfirmed')));
    }
  };

  const onWorkOtpVerified = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['time-today'] }),
      qc.invalidateQueries({ queryKey: ['booking', id] }),
      qc.invalidateQueries({ queryKey: ['bookings'] }),
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('servantHome.requestHandled')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Stitch.colors.primary, fontWeight: '600' }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const home =
    booking.latitude != null && booking.longitude != null
      ? { latitude: booking.latitude, longitude: booking.longitude }
      : null;

  const sessionDate = booking.sessionDate ? formatDate(booking.sessionDate) : null;
  const skill = booking.requestedSkill
    ? localizedSkillLabel(booking.requestedSkill, [])
    : null;
  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Stitch.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('schedule.jobDetails')}</Text>
        <View style={styles.backBtn} />
      </View>

      {!hasZones ? <ZoneRequiredBanner onAddZone={goAddZone} /> : null}

      {bookingCancelled ? (
        <GlassCard style={styles.cancelledBanner}>
          <MaterialIcons name="event-busy" size={22} color={Stitch.colors.error} />
          <Text style={styles.cancelledText}>{t('bookings.bookingCancelled')}</Text>
        </GlassCard>
      ) : null}

      <GlassCard>
        <Text style={styles.title}>{booking.houseOwner.user.name}</Text>
        <StatusPill status={booking.status} />
        <Text style={styles.meta}>{visitType}</Text>
        {skill ? <Text style={styles.detailRow}>{t('servantHome.skillLabel', { skill })}</Text> : null}
        {sessionDate ? (
          <Text style={styles.detailRow}>{t('servantHome.dateLabel', { date: sessionDate })}</Text>
        ) : null}
        {booking.sessionStartTime ? (
          <Text style={styles.detailRow}>
            {t('servantHome.timeLabel', {
              start: booking.sessionStartTime,
              end: booking.sessionEndTime
                ? t('servantHome.timeEnd', { end: booking.sessionEndTime })
                : '',
            })}
          </Text>
        ) : null}
        {booking.hoursPerDay ? (
          <Text style={styles.detailRow}>
            {t('servantHome.hoursPerDay', { hours: booking.hoursPerDay })}
          </Text>
        ) : null}
        {booking.workingDays ? (
          <Text style={styles.detailRow}>
            {t('servantHome.workingDays', { days: booking.workingDays })}
          </Text>
        ) : null}
        {formatVisitAddressLines(booking).length > 0 ? (
          <VisitAddressBanner parts={booking} />
        ) : booking.address ? (
          <Text style={styles.address}>{booking.address}</Text>
        ) : null}
        {booking.totalAmount != null && (
          <Text style={styles.amount}>
            {Stitch.copy.rupee}
            {formatCurrency(booking.totalAmount)}
          </Text>
        )}
        {booking.notes ? (
          <Text style={styles.notes}>{t('servantHome.notesLabel', { notes: booking.notes })}</Text>
        ) : null}
      </GlassCard>

      {home && bookingActionable && ['CONFIRMED', 'ACTIVE'].includes(booking.status) ? (
        <>
          <JobTrackingMap
            home={home}
            homeLabel={booking.houseOwner.user.name}
            showMyLocation
            showMapInitially={trackEnabled}
            height={220}
            visitAddress={{
              flatNo: booking.flatNo,
              building: booking.building,
              area: booking.area,
              address: booking.address,
            }}
            caption={
              trackEnabled
                ? t('servantHome.sharingLocation')
                : t('servantHome.tapDirectionsNavigate')
            }
          />
          {booking.status === 'CONFIRMED' && !clockedInHere && (
            <>
              <TouchableOpacity
                style={[styles.onWayBtn, actionsBlocked && styles.btnDisabled]}
                onPress={() => {
                  if (!requireZone()) return;
                  setSharingLocation((v) => !v);
                }}
                disabled={actionsBlocked}
              >
                <Text style={styles.onWayText}>
                  {sharingLocation
                    ? t('servantHome.stopSharingLocation')
                    : t('servantHome.onMyWayShare')}
                </Text>
              </TouchableOpacity>
              {booking.pendingWorkOtp ? (
                <WorkStartOtpPanel
                  bookingId={bookingId!}
                  expiresAt={booking.workOtpExpiresAt}
                  onVerified={onWorkOtpVerified}
                  onResend={() => qc.invalidateQueries({ queryKey: ['booking', id] })}
                  disabled={actionsBlocked}
                />
              ) : (
                <GradientButton
                  title={t('workOtp.requestOtp')}
                  onPress={markArrived}
                  style={{ marginTop: 12 }}
                  disabled={actionsBlocked}
                />
              )}
            </>
          )}
          {clockedInHere && (
            <Text style={styles.onDuty}>{t('servantHome.clockedInSharing')}</Text>
          )}
        </>
      ) : home ? (
        <LocationMapPreview
          latitude={booking.latitude}
          longitude={booking.longitude}
          address={booking.address}
          height={160}
        />
      ) : null}

      {booking.status === 'PENDING' && bookingActionable && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.accept, (acting || actionsBlocked) && styles.btnDisabled]}
            onPress={confirm}
            disabled={acting || actionsBlocked}
          >
            <Text style={styles.btnText}>
              {acting ? t('servantHome.pleaseWait') : t('schedule.accept')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reject, acting && styles.btnDisabled]}
            onPress={openDecline}
            disabled={acting}
          >
            <Text style={styles.rejectText}>{t('servantHome.decline')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    <DeclineReasonSheet
      visible={declineOpen}
      loading={declineLoading}
      onClose={() => !declineLoading && setDeclineOpen(false)}
      onConfirm={submitDecline}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 16,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Stitch.colors.primary },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  meta: { marginTop: 8, color: Stitch.colors.onSurfaceVariant },
  detailRow: { marginTop: 6, color: Stitch.colors.onBackground },
  address: { marginTop: 10, color: Stitch.colors.onBackground, lineHeight: 20 },
  amount: { marginTop: 12, fontSize: 20, fontWeight: '700', color: Stitch.colors.secondary },
  notes: { marginTop: 10, fontStyle: 'italic', color: Stitch.colors.onSurfaceVariant },
  onWayBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
  },
  onWayText: { fontWeight: '700', color: Stitch.colors.primary },
  onDuty: { marginTop: 12, textAlign: 'center', color: Stitch.colors.success, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: Stitch.spacing.padding },
  accept: {
    flex: 1,
    backgroundColor: Stitch.colors.success,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reject: {
    flex: 1,
    backgroundColor: Stitch.colors.surfaceContainer,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' },
  rejectText: { color: Stitch.colors.error, fontWeight: '700' },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
    backgroundColor: Stitch.colors.errorContainer,
  },
  cancelledText: {
    flex: 1,
    color: Stitch.colors.error,
    fontWeight: '600',
    lineHeight: 20,
  },
});
