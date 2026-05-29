import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { LocationMapPreview } from '@/components/ui/LocationMapPreview';
import { GradientButton } from '@/components/ui/GradientButton';
import { useServantLocationReporter } from '@/hooks/useServantLocationReporter';

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSkill(skill?: string | null) {
  if (!skill) return null;
  return skill.replace(/_/g, ' ');
}

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();
  const [sharingLocation, setSharingLocation] = useState(false);
  const [acting, setActing] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
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

  const apiError = (e: unknown, fallback: string) => {
    const err = e as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  };

  const confirm = async () => {
    if (acting) return;
    setActing(true);
    try {
      await api.patch(`/bookings/${id}/confirm`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['open-requests'] }),
        qc.invalidateQueries({ queryKey: ['schedule'] }),
      ]);
      Alert.alert('Accepted', 'The customer has been notified.');
    } catch (e: unknown) {
      Alert.alert('Could not accept', apiError(e, 'Try again'));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (acting) return;
    setActing(true);
    try {
      await api.patch(`/bookings/${id}/reject`, { reason: 'Unavailable at this time' });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking', id] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['open-requests'] }),
        qc.invalidateQueries({ queryKey: ['schedule'] }),
      ]);
      Alert.alert('Declined', 'The customer has been notified.');
    } catch (e: unknown) {
      Alert.alert('Could not decline', apiError(e, 'Try again'));
    } finally {
      setActing(false);
    }
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
      Alert.alert('Could not start', apiError(e, 'Check booking is confirmed'));
    }
  };

  if (isLoading || !booking) {
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

  const sessionDate = formatDate(booking.sessionDate);
  const skill = formatSkill(booking.requestedSkill);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Stitch.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job details</Text>
        <View style={styles.backBtn} />
      </View>

      <GlassCard>
        <Text style={styles.title}>{booking.houseOwner.user.name}</Text>
        <StatusPill status={booking.status} />
        <Text style={styles.meta}>{booking.bookingType}</Text>
        {skill ? <Text style={styles.detailRow}>Skill: {skill}</Text> : null}
        {sessionDate ? <Text style={styles.detailRow}>Date: {sessionDate}</Text> : null}
        {booking.sessionStartTime ? (
          <Text style={styles.detailRow}>
            Time: {booking.sessionStartTime}
            {booking.sessionEndTime ? ` – ${booking.sessionEndTime}` : ''}
          </Text>
        ) : null}
        {booking.hoursPerDay ? (
          <Text style={styles.detailRow}>{booking.hoursPerDay} hrs/day</Text>
        ) : null}
        {booking.workingDays ? (
          <Text style={styles.detailRow}>Days: {booking.workingDays}</Text>
        ) : null}
        {booking.address ? <Text style={styles.address}>{booking.address}</Text> : null}
        {booking.totalAmount != null && (
          <Text style={styles.amount}>
            {Stitch.copy.rupee}
            {booking.totalAmount.toLocaleString('en-IN')}
          </Text>
        )}
        {booking.notes ? <Text style={styles.notes}>Notes: {booking.notes}</Text> : null}
      </GlassCard>

      {home && ['CONFIRMED', 'ACTIVE'].includes(booking.status) ? (
        <>
          <JobTrackingMap
            home={home}
            homeLabel={booking.houseOwner.user.name}
            showMyLocation
            showMapInitially={trackEnabled}
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
            <Text style={styles.onDuty}>
              You are clocked in — location is shared with the customer
            </Text>
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

      {booking.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.accept, acting && styles.btnDisabled]}
            onPress={confirm}
            disabled={acting}
          >
            <Text style={styles.btnText}>{acting ? 'Please wait…' : 'Accept'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reject, acting && styles.btnDisabled]}
            onPress={reject}
            disabled={acting}
          >
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: 20, paddingTop: 52, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Stitch.colors.primary },
  title: { fontSize: 22, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  meta: { color: Stitch.colors.onSurfaceVariant, marginTop: 8, fontWeight: '600' },
  detailRow: { marginTop: 8, color: Stitch.colors.onBackground },
  address: { marginTop: 12, color: Stitch.colors.onBackground, lineHeight: 20 },
  amount: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: Stitch.colors.secondary,
  },
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
  notes: { marginTop: 12, color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
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
  btnDisabled: { opacity: 0.55 },
});
