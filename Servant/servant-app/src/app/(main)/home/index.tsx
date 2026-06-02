import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { LocationMapPreview } from '@/components/ui/LocationMapPreview';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { useServantLocationReporter } from '@/hooks/useServantLocationReporter';
import { useNotifications } from '@/hooks/useNotifications';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { computeTodayEarnings, computeMonthlyEarnings } from '@/lib/earnings';

type Booking = {
  id: number;
  status: string;
  bookingType: string;
  address?: string;
  flatNo?: string | null;
  building?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requestedSkill?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionSlots?: string | null;
  sessionDate?: string | null;
  sessionHours?: number | null;
  monthlyStartDate?: string | null;
  totalAmount?: number | null;
  updatedAt?: string;
  houseOwner: { user: { name: string } };
};

export default function ServantHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<{ clockIn: string; bookingId?: number } | null>(
    null,
  );
  const [actingId, setActingId] = useState<number | null>(null);
  const [onWayBookingId, setOnWayBookingId] = useState<number | null>(null);

  const trackingBookingId = activeBookingId ?? onWayBookingId;
  useServantLocationReporter(trackingBookingId, trackingBookingId != null);

  const refreshBookings = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['open-requests'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['schedule'] }),
    ]);

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as Booking[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 20000 : false,
  });

  const { data: profile } = useQuery({
    queryKey: ['servant-profile'],
    queryFn: async () => {
      const res = await api.get('/servants/me');
      return res.data.data.servant as { hourlyRate?: number | null };
    },
    enabled: isAuthenticated,
  });

  const { data: openRequests } = useQuery({
    queryKey: ['open-requests'],
    queryFn: async () => {
      const res = await api.get('/bookings/open-requests');
      return res.data.data.requests as Booking[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 15000 : false,
  });

  const { data: notifications } = useNotifications();

  const { data: today, refetch: refetchToday } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data as {
        totalHours?: number;
        estimatedEarnings?: number;
        hourlyRate?: number;
        entries?: { clockOut: string | null; clockIn: string; bookingId?: number }[];
      };
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 20000 : false,
  });

  const { data: monthStats } = useQuery({
    queryKey: ['time-month'],
    queryFn: async () => {
      const res = await api.get('/time/month');
      return res.data.data as {
        totalEarnings?: number;
        completedCount?: number;
        monthLabel?: string;
      };
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 20000 : false,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      refetchBookings();
      refetchToday();
      qc.invalidateQueries({ queryKey: ['time-month'] });
    }, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, refetchBookings, refetchToday]);

  useEffect(() => {
    const open = today?.entries?.find((e) => !e.clockOut);
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
      setOnWayBookingId(null);
      setActiveBookingId(bookingId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['time-today'] }),
        qc.invalidateQueries({ queryKey: ['time-month'] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['time-today'] }),
        qc.invalidateQueries({ queryKey: ['time-month'] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
      Alert.alert('Clocked out', 'Hours saved for payout.');
    } catch (e: unknown) {
      Alert.alert('Error', apiError(e, 'Could not clock out'));
    }
  };

  const confirm = async (id: number) => {
    if (actingId != null) return;
    setActingId(id);
    try {
      await api.patch(`/bookings/${id}/confirm`);
      await refreshBookings();
      Alert.alert('Accepted', 'The customer has been notified.');
    } catch (e: unknown) {
      const message = apiError(e, 'Try again');
      if (message.toLowerCase().includes('not pending')) {
        await refreshBookings();
        Alert.alert('Already handled', 'This request was already accepted or declined.');
      } else {
        Alert.alert('Could not accept', message);
      }
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: number) => {
    if (actingId != null) return;
    setActingId(id);
    try {
      await api.patch(`/bookings/${id}/reject`, { reason: 'Unavailable at this time' });
      await refreshBookings();
      Alert.alert('Declined', 'The customer has been notified.');
    } catch (e: unknown) {
      const message = apiError(e, 'Try again');
      if (message.toLowerCase().includes('not pending')) {
        await refreshBookings();
        Alert.alert('Already handled', 'This request was already accepted or declined.');
      } else {
        Alert.alert('Could not decline', message);
      }
    } finally {
      setActingId(null);
    }
  };

  const unread = (notifications || []).filter((n) => !n.isRead).length;

  const openJobDetail = (bookingId: number) => {
    router.push(`/(main)/schedule/${bookingId}`);
  };

  const hourlyRate = profile?.hourlyRate ?? today?.hourlyRate ?? 0;
  const todayStats = computeTodayEarnings(bookings || [], hourlyRate, today);
  const monthlyFromBookings = computeMonthlyEarnings(bookings || [], hourlyRate);
  const monthlyAmount = Math.max(monthStats?.totalEarnings ?? 0, monthlyFromBookings.amount);
  const monthlyCount = Math.max(
    monthStats?.completedCount ?? 0,
    monthlyFromBookings.completedCount,
  );
  const monthLabel = monthStats?.monthLabel ?? monthlyFromBookings.monthLabel;

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
          <Pressable
            onPress={() => router.push('/(main)/notifications')}
            style={styles.notifBtn}
            hitSlop={8}
          >
            <MaterialIcons name="notifications" size={22} color={Stitch.colors.primary} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {unread > 0 && (
        <Pressable onPress={() => router.push('/(main)/notifications')}>
          <GlassCard style={styles.notifBanner}>
            <MaterialIcons name="notifications-active" size={20} color={Stitch.colors.secondary} />
            <Text style={styles.notifText}>
              {unread} new notification{unread > 1 ? 's' : ''} — tap to view
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={Stitch.colors.onSurfaceVariant} />
          </GlassCard>
        </Pressable>
      )}

      <View style={styles.earnRow}>
        <View>
          <Text style={styles.earnLabel}>TODAY&apos;S EARNINGS</Text>
          <Text style={styles.earnValue}>
            {Stitch.copy.rupee}
            {todayStats.amount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.earnSub}>
            {todayStats.completedCount > 0
              ? `${todayStats.completedCount} job${todayStats.completedCount === 1 ? '' : 's'} completed today`
              : todayStats.hoursToday > 0
                ? `${todayStats.hoursToday.toFixed(1)} hrs logged today`
                : 'Earnings update when slots end or you clock out'}
          </Text>
        </View>
        <View style={styles.jobsBadge}>
          <Text style={styles.jobsNum}>{todayJobs.length}</Text>
          <Text style={styles.jobsLbl}>JOBS</Text>
        </View>
      </View>

      <GlassCard style={styles.monthCard}>
        <View style={styles.monthRow}>
          <View style={styles.monthIconWrap}>
            <MaterialIcons name="calendar-month" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.monthBody}>
            <Text style={styles.monthLabel}>THIS MONTH · {monthLabel.toUpperCase()}</Text>
            <Text style={styles.monthValue}>
              {Stitch.copy.rupee}
              {monthlyAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.monthSub}>
              {monthlyCount > 0
                ? `${monthlyCount} completed job${monthlyCount === 1 ? '' : 's'} this month`
                : 'Completed visits count toward monthly total'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(main)/earnings')} hitSlop={8}>
            <MaterialIcons name="chevron-right" size={24} color={Stitch.colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </GlassCard>

      {activeEntry ? (
        <>
          <Pressable onPress={() => activeBookingId && openJobDetail(activeBookingId)}>
            <LinearGradient colors={[Stitch.colors.error, '#c62828']} style={styles.clockCard}>
              <Text style={styles.clockLabel}>Work in progress</Text>
              <Text style={styles.clockTime}>{formatElapsed(elapsed)}</Text>
              <Text style={styles.viewDetail}>Tap for job details</Text>
              <TouchableOpacity style={styles.clockBtn} onPress={clockOut}>
                <Text style={styles.clockBtnText}>End work & clock out</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
          {(() => {
            const activeJob = todayJobs.find((b) => b.id === activeBookingId);
            const home =
              activeJob?.latitude != null && activeJob?.longitude != null
                ? { latitude: activeJob.latitude, longitude: activeJob.longitude }
                : null;
            return (
              <View style={styles.liveMap}>
                <JobTrackingMap
                  home={home}
                  homeLabel={activeJob?.houseOwner.user.name || 'Customer'}
                  showMyLocation
                  showMapInitially
                  height={220}
                  visitAddress={
                    activeJob
                      ? {
                          flatNo: activeJob.flatNo,
                          building: activeJob.building,
                          area: activeJob.area,
                          address: activeJob.address,
                        }
                      : null
                  }
                  caption="Sharing live location with customer"
                />
              </View>
            );
          })()}
        </>
      ) : null}

      {openRequests && openRequests.length > 0 && (
        <>
          <Text style={styles.section}>Open requests in your service area</Text>
          <Text style={styles.sectionSub}>
            Only customers near your zones appear here — helpers outside your area cannot see these.
          </Text>
          {openRequests.map((b) => {
            const slotLabel = formatSessionSlotsLabel(
              b.sessionSlots,
              b.sessionStartTime,
              b.sessionEndTime,
            );
            const visitDate = b.sessionDate
              ? new Date(b.sessionDate).toLocaleDateString('en-IN')
              : null;
            return (
            <GlassCard key={`open-${b.id}`} style={styles.mb}>
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.houseOwner.user.name}</Text>
                  <Text style={styles.cardMeta}>
                    {b.requestedSkill ? b.requestedSkill.replace(/_/g, ' ') : 'General help'}
                    {' · '}
                    {b.bookingType === 'SESSION' ? 'One visit' : 'Monthly'}
                  </Text>
                  {visitDate && slotLabel ? (
                    <Text style={styles.slotText}>
                      {visitDate} · {slotLabel}
                    </Text>
                  ) : slotLabel ? (
                    <Text style={styles.slotText}>{slotLabel}</Text>
                  ) : null}
                  {b.address ? <Text style={styles.addr}>{b.address}</Text> : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </Pressable>
              <LocationMapPreview
                latitude={b.latitude}
                longitude={b.longitude}
                address={b.address}
                height={140}
              />
              <TouchableOpacity
                style={[styles.accept, actingId === b.id && styles.btnDisabled]}
                onPress={() => confirm(b.id)}
                disabled={actingId != null}
              >
                <Text style={styles.acceptText}>
                  {actingId === b.id ? 'Accepting…' : 'Accept job (first wins)'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
            );
          })}
        </>
      )}

      {pending.length > 0 && (
        <>
          <Text style={styles.section}>New requests — accept or decline</Text>
          {pending.map((b) => (
            <GlassCard key={b.id} style={styles.mb}>
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.houseOwner.user.name}</Text>
                  <Text style={styles.cardMeta}>{b.bookingType}</Text>
                  {b.address ? <Text style={styles.addr}>{b.address}</Text> : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </Pressable>
              <LocationMapPreview
                latitude={b.latitude}
                longitude={b.longitude}
                address={b.address}
                height={140}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.accept, actingId === b.id && styles.btnDisabled]}
                  onPress={() => confirm(b.id)}
                  disabled={actingId != null}
                >
                  <Text style={styles.acceptText}>
                    {actingId === b.id ? 'Please wait…' : 'Accept'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reject, actingId === b.id && styles.btnDisabled]}
                  onPress={() => reject(b.id)}
                  disabled={actingId != null}
                >
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
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={styles.jobRow}>
                  <MaterialIcons name="location-on" size={18} color={Stitch.colors.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{b.houseOwner.user.name}</Text>
                    <Text style={styles.cardMeta}>
                      {formatVisitAddressLines(b).join(' · ') || b.address || 'Address on file'}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={Stitch.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
              <StatusPill status={b.status} />
              {b.latitude != null && b.longitude != null ? (
                <JobTrackingMap
                  home={{ latitude: b.latitude, longitude: b.longitude }}
                  homeLabel={b.houseOwner.user.name}
                  showMyLocation={!activeEntry}
                  showMapInitially={onWayBookingId === b.id}
                  height={160}
                  visitAddress={{
                    flatNo: b.flatNo,
                    building: b.building,
                    area: b.area,
                    address: b.address,
                  }}
                  caption={
                    onWayBookingId === b.id
                      ? 'Location shared with customer'
                      : 'Tap directions to navigate'
                  }
                />
              ) : (
                <LocationMapPreview
                  latitude={b.latitude}
                  longitude={b.longitude}
                  address={b.address}
                  height={140}
                />
              )}
              {!activeEntry && b.status === 'CONFIRMED' && (
                <>
                  <TouchableOpacity
                    style={styles.onWayBtn}
                    onPress={() =>
                      setOnWayBookingId((prev) => (prev === b.id ? null : b.id))
                    }
                  >
                    <Text style={styles.onWayText}>
                      {onWayBookingId === b.id
                        ? 'Stop sharing location'
                        : "I'm on my way — share location"}
                    </Text>
                  </TouchableOpacity>
                  <GradientButton
                    title="I arrived — start work"
                    onPress={() => clockIn(b.id)}
                    style={{ marginTop: 12 }}
                  />
                </>
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
  notifBtn: { marginLeft: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: Stitch.colors.gradientEnd,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
  earnSub: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    maxWidth: 220,
    lineHeight: 16,
  },
  jobsBadge: {
    backgroundColor: 'rgba(214, 151, 254, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  jobsNum: { fontSize: 22, fontWeight: '700', color: Stitch.colors.secondary },
  jobsLbl: { fontSize: 10, fontWeight: '700', color: Stitch.colors.secondary },
  monthCard: { marginHorizontal: Stitch.spacing.padding, marginBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(214, 151, 254, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBody: { flex: 1 },
  monthLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Stitch.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  monthValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginTop: 4,
  },
  monthSub: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  clockCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, marginBottom: 12 },
  liveMap: { marginHorizontal: 24, marginBottom: 20 },
  clockLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  clockTime: { color: '#fff', fontSize: 32, fontWeight: '700', marginVertical: 12 },
  viewDetail: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 12 },
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
  sectionSub: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginHorizontal: 24,
    marginBottom: 12,
    marginTop: -6,
    lineHeight: 18,
  },
  mb: { marginHorizontal: 24, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardMeta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4, marginBottom: 4 },
  slotText: { fontSize: 13, color: Stitch.colors.primary, fontWeight: '600', marginBottom: 4 },
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
  btnDisabled: { opacity: 0.55 },
  onWayBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Stitch.colors.secondary,
  },
  onWayText: { color: Stitch.colors.secondary, fontWeight: '600', fontSize: 13 },
  jobRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
  onDuty: { marginTop: 10, color: Stitch.colors.success, fontWeight: '600' },
});
