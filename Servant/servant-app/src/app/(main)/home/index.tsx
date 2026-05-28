import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';

type Booking = {
  id: number;
  status: string;
  bookingType: string;
  address?: string;
  houseOwner: { user: { name: string } };
};

export default function ServantHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<{ clockIn: string; bookingId?: number } | null>(
    null,
  );

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as Booking[];
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data.notifications as Array<{ id: number; title: string; body: string; isRead: boolean }>;
    },
    refetchInterval: 30000,
  });

  const { data: today } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data;
    },
  });

  useEffect(() => {
    const open = today?.entries?.find((e: { clockOut: string | null }) => !e.clockOut);
    if (open) {
      setActiveEntry({ clockIn: open.clockIn, bookingId: open.bookingId });
      setActiveBookingId(open.bookingId ?? null);
    } else {
      setActiveEntry(null);
      setActiveBookingId(null);
    }
  }, [today]);

  useEffect(() => {
    if (!activeEntry) return;
    const t = setInterval(() => {
      setElapsed((Date.now() - new Date(activeEntry.clockIn).getTime()) / 1000);
    }, 1000);
    return () => clearInterval(t);
  }, [activeEntry]);

  const pending = (bookings || []).filter((b) => b.status === 'PENDING');
  const todayJobs = (bookings || []).filter((b) => ['CONFIRMED', 'ACTIVE'].includes(b.status));

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const apiError = (e: unknown, fallback: string) => {
    const err = e as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  };

  const clockIn = async (bookingId: number) => {
    try {
      await api.post('/time/clock-in', { bookingId });
      setActiveBookingId(bookingId);
      qc.invalidateQueries({ queryKey: ['time-today', 'bookings'] });
      Alert.alert('Work started', 'You are on duty at the customer location.');
    } catch (e: unknown) {
      Alert.alert('Could not start', apiError(e, 'Check booking is confirmed'));
    }
  };

  const clockOut = async () => {
    try {
      await api.post('/time/clock-out');
      setActiveEntry(null);
      setActiveBookingId(null);
      qc.invalidateQueries({ queryKey: ['time-today', 'bookings'] });
      Alert.alert('Clocked out', 'Hours saved for payout.');
    } catch (e: unknown) {
      Alert.alert('Error', apiError(e, 'Could not clock out'));
    }
  };

  const confirm = async (id: number) => {
    try {
      await api.patch(`/bookings/${id}/confirm`);
      qc.invalidateQueries({ queryKey: ['bookings', 'notifications'] });
      Alert.alert('Accepted', 'The customer has been notified.');
    } catch (e: unknown) {
      Alert.alert('Could not accept', apiError(e, 'Try again'));
    }
  };

  const reject = async (id: number) => {
    try {
      await api.patch(`/bookings/${id}/reject`, { reason: 'Unavailable at this time' });
      qc.invalidateQueries({ queryKey: ['bookings', 'notifications'] });
      Alert.alert('Declined', 'The customer has been notified.');
    } catch (e: unknown) {
      Alert.alert('Could not decline', apiError(e, 'Try again'));
    }
  };

  const unread = (notifications || []).filter((n) => !n.isRead).length;

  const todayEarnings = (bookings || [])
    .filter((b) => b.status === 'COMPLETED')
    .reduce((s, b) => s + ((b as Booking & { totalAmount?: number }).totalAmount || 0), 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <View style={styles.proRow}>
          <View style={styles.proAvatar}>
            <Text style={styles.proAvatarText}>{user?.name?.[0]}</Text>
          </View>
          <View>
            <Text style={styles.proBrand}>StaffEra Pro</Text>
            <Text style={styles.proName}>Namaste, {user?.name?.split(' ')[0]}</Text>
          </View>
        </View>
        <View style={styles.online}>
          <View style={styles.dot} />
          <Text style={styles.onlineText}>ONLINE</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>

      {unread > 0 && (
        <GlassCard style={styles.notifBanner}>
          <MaterialIcons name="notifications-active" size={20} color={Stitch.colors.secondary} />
          <Text style={styles.notifText}>
            {unread} new notification{unread > 1 ? 's' : ''} — check booking requests below
          </Text>
        </GlassCard>
      )}

      <View style={styles.earnRow}>
        <View>
          <Text style={styles.earnLabel}>TODAY&apos;S EARNINGS</Text>
          <Text style={styles.earnValue}>
            {Stitch.copy.rupee}
            {todayEarnings.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.jobsBadge}>
          <Text style={styles.jobsNum}>{todayJobs.length}</Text>
          <Text style={styles.jobsLbl}>JOBS</Text>
        </View>
      </View>

      {activeEntry ? (
        <LinearGradient colors={[Stitch.colors.error, '#c62828']} style={styles.clockCard}>
          <Text style={styles.clockLabel}>Work in progress</Text>
          <Text style={styles.clockTime}>{formatElapsed(elapsed)}</Text>
          <TouchableOpacity style={styles.clockBtn} onPress={clockOut}>
            <Text style={styles.clockBtnText}>End work & clock out</Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : null}

      {pending.length > 0 && (
        <>
          <Text style={styles.section}>New requests — accept or decline</Text>
          {pending.map((b) => (
            <GlassCard key={b.id} style={styles.mb}>
              <Text style={styles.cardTitle}>{b.houseOwner.user.name}</Text>
              <Text style={styles.cardMeta}>{b.bookingType}</Text>
              {b.address ? <Text style={styles.addr}>{b.address}</Text> : null}
              <View style={styles.row}>
                <TouchableOpacity style={styles.accept} onPress={() => confirm(b.id)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reject} onPress={() => reject(b.id)}>
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </>
      )}

      <Text style={styles.section}>Today&apos;s jobs</Text>
      {todayJobs.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>No confirmed jobs — stay online for new requests</Text>
        </GlassCard>
      ) : (
        todayJobs.map((b) => {
          const isActive = b.status === 'ACTIVE' || activeBookingId === b.id;
          return (
            <GlassCard key={b.id} style={styles.mb}>
              <View style={styles.jobRow}>
                <MaterialIcons name="location-on" size={18} color={Stitch.colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.houseOwner.user.name}</Text>
                  <Text style={styles.cardMeta}>{b.address || 'Address on file'}</Text>
                </View>
              </View>
              <StatusPill status={b.status} />
              {!activeEntry && b.status === 'CONFIRMED' && (
                <GradientButton
                  title="I arrived — start work"
                  onPress={() => clockIn(b.id)}
                  style={{ marginTop: 12 }}
                />
              )}
              {isActive && activeEntry && (
                <Text style={styles.onDuty}>You are clocked in at this home</Text>
              )}
            </GlassCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingBottom: 100 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 16,
    backgroundColor: 'rgba(252,248,255,0.9)',
  },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proAvatarText: { fontSize: 20, fontWeight: '700', color: Stitch.colors.primary },
  proBrand: { fontSize: 12, fontWeight: '700', color: Stitch.colors.primary },
  proName: { fontSize: 16, fontWeight: '600' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  onlineText: { fontSize: 11, fontWeight: '700', color: Stitch.colors.primary, letterSpacing: 1 },
  badge: {
    backgroundColor: Stitch.colors.gradientEnd,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  notifBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifText: { flex: 1, fontSize: 13, color: Stitch.colors.onBackground },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Stitch.spacing.padding,
    marginBottom: 20,
  },
  earnLabel: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  earnValue: { fontSize: 36, fontWeight: '700', color: Stitch.colors.primary, marginTop: 4 },
  jobsBadge: {
    backgroundColor: 'rgba(214, 151, 254, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  jobsNum: { fontSize: 22, fontWeight: '700', color: Stitch.colors.secondary },
  jobsLbl: { fontSize: 10, fontWeight: '700', color: Stitch.colors.secondary },
  clockCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, marginBottom: 20 },
  clockLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  clockTime: { color: '#fff', fontSize: 32, fontWeight: '700', marginVertical: 12 },
  clockBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clockBtnText: { color: Stitch.colors.error, fontWeight: '700' },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginHorizontal: 24,
    marginBottom: 12,
    marginTop: 8,
  },
  mb: { marginHorizontal: 24, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardMeta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4, marginBottom: 4 },
  addr: { fontSize: 13, color: Stitch.colors.secondary, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  accept: {
    flex: 1,
    backgroundColor: Stitch.colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '600' },
  reject: {
    flex: 1,
    borderWidth: 2,
    borderColor: Stitch.colors.error,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  rejectText: { color: Stitch.colors.error, fontWeight: '600' },
  jobRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
  onDuty: { marginTop: 10, color: Stitch.colors.success, fontWeight: '600' },
});
