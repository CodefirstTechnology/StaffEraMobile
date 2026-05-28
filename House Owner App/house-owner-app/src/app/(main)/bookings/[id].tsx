import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { useBookingTrackingPoll } from '@/hooks/useBookingTrackingPoll';

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
    PENDING: 'Waiting for helper to accept',
    CONFIRMED: 'Helper accepted — you will see them on the map when they share location',
    ACTIVE: 'Work in progress — live location updates below',
    REJECTED: 'Helper declined this request',
    CANCELLED: 'You cancelled this booking',
    COMPLETED: 'Visit completed',
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.back} onPress={() => router.back()}>
        ← Back
      </Text>
      <GlassCard>
        <Text style={styles.name}>{booking.servant.user.name}</Text>
        <StatusPill status={booking.status} />
        <Text style={styles.hint}>{statusHint[booking.status] || ''}</Text>
        <Text style={styles.row}>Type: {booking.bookingType}</Text>
        {booking.address ? <Text style={styles.row}>Address: {booking.address}</Text> : null}
        {booking.totalAmount != null && (
          <Text style={styles.amount}>
            {Stitch.copy.rupee}
            {booking.totalAmount.toLocaleString('en-IN')}
          </Text>
        )}
      </GlassCard>

      {home && trackLive ? (
        <JobTrackingMap
          home={home}
          servant={servant}
          lastUpdated={tracking?.servant?.updatedAt ?? null}
        />
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
  amount: { marginTop: 12, fontSize: 20, fontWeight: '700', color: Stitch.colors.secondary },
});
