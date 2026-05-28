import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Stitch, StatusColors } from '@/theme/stitch';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { GradientButton } from '@/components/ui/GradientButton';
import { useServantLocationReporter } from '@/hooks/useServantLocationReporter';

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();
  const [sharingLocation, setSharingLocation] = useState(false);

  const { data: booking } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
  });

  const { data: today } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data;
    },
  });

  const openEntry = today?.entries?.find((e: { clockOut: string | null }) => !e.clockOut);
  const clockedInHere = openEntry?.bookingId === bookingId;
  const trackEnabled =
    bookingId != null &&
    (clockedInHere || (sharingLocation && booking?.status === 'CONFIRMED'));

  useServantLocationReporter(bookingId, trackEnabled);

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const home =
    booking.latitude != null && booking.longitude != null
      ? { latitude: booking.latitude, longitude: booking.longitude }
      : null;

  const confirm = async () => {
    await api.patch(`/bookings/${id}/confirm`);
    qc.invalidateQueries({ queryKey: ['booking', id] });
    Alert.alert('Confirmed');
  };

  const reject = async () => {
    await api.patch(`/bookings/${id}/reject`);
    qc.invalidateQueries({ queryKey: ['booking', id] });
  };

  const clockIn = async () => {
    try {
      await api.post('/time/clock-in', { bookingId });
      setSharingLocation(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['time-today'] }),
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
      Alert.alert('Work started', 'You are on duty at the customer location.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Could not start', err.response?.data?.message || 'Check booking is confirmed');
    }
  };

  const statusStyle = StatusColors[booking.status] || StatusColors.PENDING;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{booking.houseOwner.user.name}</Text>
      <Text style={styles.meta}>{booking.bookingType}</Text>
      <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
        <Text style={{ color: statusStyle.text }}>{booking.status}</Text>
      </View>
      {booking.address ? <Text style={styles.address}>{booking.address}</Text> : null}

      {home && ['CONFIRMED', 'ACTIVE'].includes(booking.status) ? (
        <>
          <JobTrackingMap
            home={home}
            homeLabel={booking.houseOwner.user.name}
            showMyLocation
            height={220}
            caption={
              trackEnabled
                ? 'Sharing live location with customer'
                : 'Tap directions to navigate to the home'
            }
          />
          {booking.status === 'CONFIRMED' && !clockedInHere && (
            <>
              <TouchableOpacity
                style={styles.onWayBtn}
                onPress={() => setSharingLocation((v) => !v)}
              >
                <Text style={styles.onWayText}>
                  {sharingLocation
                    ? 'Stop sharing location'
                    : "I'm on my way — share location"}
                </Text>
              </TouchableOpacity>
              <GradientButton
                title="I arrived — start work"
                onPress={clockIn}
                style={{ marginTop: 12 }}
              />
            </>
          )}
          {clockedInHere && (
            <Text style={styles.onDuty}>You are clocked in — location is shared with the customer</Text>
          )}
        </>
      ) : null}

      {booking.notes ? <Text style={styles.notes}>Notes: {booking.notes}</Text> : null}
      {booking.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.accept} onPress={confirm}>
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reject} onPress={reject}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  title: { fontSize: 22, fontWeight: '700', color: Stitch.colors.primary },
  meta: { color: Stitch.colors.onSurfaceVariant, marginTop: 8 },
  badge: { alignSelf: 'flex-start', padding: 8, borderRadius: 8, marginTop: 12 },
  address: { marginTop: 16, color: Stitch.colors.onBackground, lineHeight: 20 },
  onWayBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Stitch.colors.secondary,
    alignItems: 'center',
  },
  onWayText: { color: Stitch.colors.secondary, fontWeight: '700', fontSize: 14 },
  onDuty: {
    marginTop: 12,
    fontSize: 13,
    color: Stitch.colors.primary,
    fontWeight: '600',
  },
  notes: { marginTop: 16, color: Stitch.colors.onSurfaceVariant },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  accept: {
    flex: 1,
    backgroundColor: Stitch.colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  reject: {
    flex: 1,
    borderWidth: 2,
    borderColor: Stitch.colors.error,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rejectText: { color: Stitch.colors.error, fontWeight: '600' },
});
