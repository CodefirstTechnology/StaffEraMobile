import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';

export default function NewBookingScreen() {
  const { servantId } = useLocalSearchParams<{ servantId: string }>();
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
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const { data: servant } = useQuery({
    queryKey: ['servant', servantId],
    enabled: !!servantId,
    queryFn: async () => {
      const res = await api.get(`/servants/${servantId}`);
      return res.data.data.servant;
    },
  });

  const totalAmount =
    bookingType === 'SESSION'
      ? (servant?.hourlyRate || 0) *
        Math.max(
          1,
          (parseInt(sessionEnd.split(':')[0], 10) || 0) -
            (parseInt(sessionStart.split(':')[0], 10) || 0),
        )
      : servant?.monthlyRate || 0;

  const submit = async () => {
    if (!servantId) {
      Alert.alert('Error', 'Select a helper from Browse first');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        servantId: Number(servantId),
        bookingType,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        totalAmount: totalAmount || undefined,
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
      Alert.alert(
        'Request sent',
        'The helper will accept or decline. You will be notified.',
      );
      router.replace(`/(main)/bookings/${res.data.data.booking.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Booking failed', err.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Book {servant?.user?.name || 'helper'}</Text>

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
        <>
          <Text style={styles.hint}>Monthly: {monthlyStart.toLocaleDateString('en-IN')} → {monthlyEnd.toLocaleDateString('en-IN')}</Text>
        </>
      )}

      <GhostInput
        label="Home address"
        value={address}
        onChangeText={setAddress}
        placeholder="Flat, street, area"
      />
      <GhostInput label="Notes (optional)" value={notes} onChangeText={setNotes} />

      <Text style={styles.estimate}>
        Estimated: {Stitch.copy.rupee}
        {totalAmount.toLocaleString('en-IN')}
      </Text>

      <GradientButton title="Send booking request" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 20 },
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
  estimate: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginVertical: 16,
    textAlign: 'center',
  },
});
