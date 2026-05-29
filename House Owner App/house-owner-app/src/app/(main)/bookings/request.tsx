import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import type { LocationValue } from '@/lib/locationTypes';
import { useLiveLocation } from '@/hooks/useLiveLocation';

export default function AreaBookingRequestScreen() {
  const { skill } = useLocalSearchParams<{ skill?: string }>();
  const { location: liveLocation, loading: locLoading } = useLiveLocation();
  const [bookingType, setBookingType] = useState<'SESSION' | 'MONTHLY'>('SESSION');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [sessionStart, setSessionStart] = useState('09:00');
  const [sessionEnd, setSessionEnd] = useState('13:00');
  const [monthlyStart, setMonthlyStart] = useState(new Date());
  const [monthlyEnd, setMonthlyEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (liveLocation) setLocation(liveLocation);
  }, [liveLocation]);

  const submit = async () => {
    if (!location?.address || location.latitude == null || location.longitude == null) {
      Alert.alert('Location required', 'Allow live location or pick your address on the map.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        bookingType,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes.trim() || undefined,
        requestedSkill: skill ? String(skill).toUpperCase() : undefined,
      };

      if (bookingType === 'SESSION') {
        const day = new Date(sessionDate);
        day.setHours(12, 0, 0, 0);
        payload.sessionDate = day.toISOString();
        payload.sessionStartTime = sessionStart;
        payload.sessionEndTime = sessionEnd;
        payload.sessionHours = Math.max(
          1,
          (parseInt(sessionEnd.split(':')[0], 10) || 0) -
            (parseInt(sessionStart.split(':')[0], 10) || 0),
        );
      } else {
        payload.monthlyStartDate = monthlyStart.toISOString();
        payload.monthlyEndDate = monthlyEnd.toISOString();
        payload.hoursPerDay = 8;
        payload.workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      }

      const res = await api.post('/bookings', payload);
      const notified = res.data.data.broadcast?.notifiedServants ?? 0;
      Alert.alert(
        'Request broadcast',
        notified > 0
          ? `${notified} nearby helper(s) notified. The first to accept gets your job.`
          : 'Request sent. We will notify helpers when someone is available in your area.',
      );
      router.replace(`/(main)/bookings/${res.data.data.booking.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Request failed', err.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Request help in my area</Text>
      <Text style={styles.sub}>
        Nearby verified helpers will see this request. Whoever accepts first is assigned.
      </Text>

      <View style={styles.toggle}>
        {(['SESSION', 'MONTHLY'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, bookingType === t && styles.toggleOn]}
            onPress={() => setBookingType(t)}
          >
            <Text style={[styles.toggleText, bookingType === t && styles.toggleTextOn]}>
              {t === 'SESSION' ? 'One visit' : 'Monthly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {bookingType === 'SESSION' ? (
        <>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
            <Text style={styles.dateLabel}>Visit date</Text>
            <Text style={styles.dateValue}>{sessionDate.toLocaleDateString('en-IN')}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={sessionDate}
              mode="date"
              onChange={(_, d) => {
                setShowDate(false);
                if (d) setSessionDate(d);
              }}
            />
          )}
          <GhostInput label="Start time (HH:MM)" value={sessionStart} onChangeText={setSessionStart} />
          <GhostInput label="End time (HH:MM)" value={sessionEnd} onChangeText={setSessionEnd} />
        </>
      ) : (
        <Text style={styles.hint}>
          Monthly: {monthlyStart.toLocaleDateString('en-IN')} → {monthlyEnd.toLocaleDateString('en-IN')}
        </Text>
      )}

      <LocationPicker
        label="Your live location"
        placeholder={locLoading ? 'Getting location…' : 'Search or use current location'}
        value={location}
        onChange={setLocation}
      />
      <GhostInput label="Notes (optional)" value={notes} onChangeText={setNotes} />

      <GradientButton
        title="Broadcast request to nearby helpers"
        onPress={submit}
        loading={loading || locLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginBottom: 20 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: Stitch.colors.secondary },
  toggleText: { fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  toggleTextOn: { color: '#fff' },
  dateBtn: {
    backgroundColor: Stitch.colors.surfaceLow,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateLabel: { fontSize: 12, color: Stitch.colors.onSurfaceVariant },
  dateValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  hint: { marginBottom: 16, color: Stitch.colors.onSurfaceVariant },
});
