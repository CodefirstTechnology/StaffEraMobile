import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { useBookingTrackingPoll } from '@/hooks/useBookingTrackingPoll';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import { formatVisitAddressLines } from '@/lib/visitAddress';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
    refetchInterval: (query) => {
      const b = query.state.data;
      return b?.status === 'PENDING' && !b?.servant ? 5000 : false;
    },
  });

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

  const trackLive = ['CONFIRMED', 'ACTIVE'].includes(booking?.status ?? '');
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
      qc.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert('Cancelled', 'Booking was cancelled');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err.response?.data?.message || 'Could not cancel');
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const statusHint: Record<string, string> = {
    PENDING: booking.servant
      ? 'Waiting for helper to accept'
      : areaHelpers.length > 0
        ? `Sent to ${areaHelpers.length} verified helper${areaHelpers.length === 1 ? '' : 's'} in your area — only they can see this on their dashboard. First to accept gets the job.`
        : 'Waiting for a verified helper in your area — only nearby helpers will see this on their dashboard',
    CONFIRMED: helperSharing
      ? `${booking.servant?.user?.name || 'Helper'} is on the way — live map updates every few seconds below`
      : 'Helper accepted — live map appears when they tap "I\'m on my way — share location" in their app',
    ACTIVE: helperSharing
      ? 'Work in progress — helper location updates on the map below'
      : 'Work in progress — waiting for helper to share location',
    REJECTED: 'Helper declined this request',
    CANCELLED: 'You cancelled this booking',
    EXPIRED: 'Visit time passed — no helper accepted or work was not completed',
    COMPLETED: 'Visit completed',
  };

  const slotLabel = formatSessionSlotsLabel(
    booking.sessionSlots,
    booking.sessionStartTime,
    booking.sessionEndTime,
  );
  const visitDate = booking.sessionDate
    ? new Date(booking.sessionDate).toLocaleDateString('en-IN')
    : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.back} onPress={() => router.back()}>
        ← Back
      </Text>
      <GlassCard>
        <Text style={styles.name}>
          {booking.servant?.user?.name || 'Finding nearby helper…'}
        </Text>
        <StatusPill status={booking.status} />
        <Text style={styles.hint}>{statusHint[booking.status] || ''}</Text>
        <Text style={styles.row}>
          Type: {booking.bookingType === 'SESSION' ? 'One visit' : 'Monthly'}
        </Text>
        {booking.requestedSkill ? (
          <Text style={styles.row}>Category: {booking.requestedSkill.replace(/_/g, ' ')}</Text>
        ) : null}
        {visitDate && slotLabel ? (
          <Text style={styles.row}>
            Time slot{slotLabel?.includes(',') ? 's' : ''}: {visitDate} · {slotLabel}
          </Text>
        ) : slotLabel ? (
          <Text style={styles.row}>Time slot: {slotLabel}</Text>
        ) : null}
        {formatVisitAddressLines(booking).length > 0 ? (
          <VisitAddressBanner parts={booking} title="Visit address" />
        ) : booking.address ? (
          <Text style={styles.row}>Address: {booking.address}</Text>
        ) : null}
        {isOpenBroadcast && areaHelpers.length > 0 ? (
          <Text style={styles.helpers}>
            Helpers notified in your area: {areaHelpers.map((h) => h.user.name).join(', ')}
          </Text>
        ) : null}
        {booking.totalAmount != null && (
          <Text style={styles.amount}>
            {Stitch.copy.rupee}
            {booking.totalAmount.toLocaleString('en-IN')}
          </Text>
        )}
      </GlassCard>

      {helperSharing && canTrack ? (
        <View style={styles.onWayBanner}>
          <MaterialIcons name="directions-car" size={22} color={Stitch.colors.success} />
          <View style={styles.onWayTextWrap}>
            <Text style={styles.onWayTitle}>Helper is on the way</Text>
            <Text style={styles.onWaySub}>Live GPS — purple pin is helper, blue pin is your home</Text>
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
          <Text style={styles.noMapText}>
            Add your visit address on this booking to see the live map when the helper shares location.
          </Text>
        </GlassCard>
      ) : null}

      {['PENDING', 'CONFIRMED'].includes(booking.status) && (
        <GradientButton
          title="Cancel booking"
          variant="outline"
          onPress={cancel}
          style={{ marginTop: 20 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 16 },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hint: { marginTop: 12, color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
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
});
