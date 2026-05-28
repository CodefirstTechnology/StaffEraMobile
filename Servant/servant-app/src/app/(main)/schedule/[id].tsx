import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Brand, StatusColors } from '@/constants/theme';

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: booking } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
  });

  if (!booking) return <Text style={{ marginTop: 80, textAlign: 'center' }}>Loading…</Text>;

  const confirm = async () => {
    await api.patch(`/bookings/${id}/confirm`);
    qc.invalidateQueries({ queryKey: ['booking', id] });
    Alert.alert('Confirmed');
  };

  const reject = async () => {
    await api.patch(`/bookings/${id}/reject`);
    qc.invalidateQueries({ queryKey: ['booking', id] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{booking.houseOwner.user.name}</Text>
      <Text>{booking.address}</Text>
      <Text style={styles.meta}>{booking.bookingType}</Text>
      <View style={[styles.badge, { backgroundColor: StatusColors[booking.status] + '22' }]}>
        <Text style={{ color: StatusColors[booking.status] }}>{booking.status}</Text>
      </View>
      {booking.notes && <Text style={styles.notes}>Notes: {booking.notes}</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background, padding: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: Brand.subtext, marginTop: 8 },
  badge: { alignSelf: 'flex-start', padding: 8, borderRadius: 8, marginTop: 12 },
  notes: { marginTop: 16, color: Brand.subtext },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  accept: { flex: 1, backgroundColor: Brand.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  reject: { flex: 1, borderWidth: 2, borderColor: Brand.error, borderRadius: 12, padding: 14, alignItems: 'center' },
  rejectText: { color: Brand.error, fontWeight: '600' },
});
