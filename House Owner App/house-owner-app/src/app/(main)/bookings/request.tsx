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
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import type { LocationValue } from '@/lib/locationTypes';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';
import { useSkills } from '@/hooks/useSkills';
import { DEFAULT_TIME_SLOTS, formatSessionSlotsLabel, slotsToPayload, type TimeSlot } from '@/lib/timeSlots';

export default function AreaBookingRequestScreen() {
  const user = useAuthStore((s) => s.user);
  const { skill: skillParam } = useLocalSearchParams<{ skill?: string }>();
  const { data: skills = [] } = useSkills();
  const requestedSkillFromRoute = skillParam ? String(skillParam).toUpperCase() : undefined;
  const [selectedSkill, setSelectedSkill] = useState(requestedSkillFromRoute || '');
  const { location: liveLocation, loading: locLoading } = useLiveLocation();
  const [bookingType, setBookingType] = useState<'SESSION' | 'MONTHLY'>('SESSION');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [monthlyStart, setMonthlyStart] = useState(new Date());
  const [monthlyEnd, setMonthlyEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [addressUnit, setAddressUnit] = useState<AddressUnitValue>({
    flatNo: '',
    building: '',
    area: '',
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (requestedSkillFromRoute) setSelectedSkill(requestedSkillFromRoute);
  }, [requestedSkillFromRoute]);

  useEffect(() => {
    if (liveLocation) setLocation(liveLocation);
  }, [liveLocation]);

  useEffect(() => {
    const ho = user?.houseOwner;
    if (!ho) return;
    setAddressUnit({
      flatNo: ho.flatNo || '',
      building: ho.building || '',
      area: ho.area || '',
    });
  }, [user?.houseOwner]);

  const skillLabel =
    skills.find((s) => s.code === selectedSkill)?.label ||
    selectedSkill.replace(/_/g, ' ');

  const { data: nearbyHelpers = [] } = useQuery({
    queryKey: ['servants', selectedSkill, location?.latitude, location?.longitude],
    enabled:
      !!selectedSkill &&
      location?.latitude != null &&
      location?.longitude != null &&
      !Number.isNaN(location.latitude) &&
      !Number.isNaN(location.longitude),
    queryFn: async () => {
      const res = await api.get('/servants', {
        params: {
          skill: selectedSkill,
          latitude: location!.latitude,
          longitude: location!.longitude,
        },
      });
      return res.data.data.servants as { user: { name: string } }[];
    },
  });

  const nearbyCount = nearbyHelpers.length;
  const requestTypeLabel = bookingType === 'SESSION' ? 'One visit' : 'Monthly';

  const slotsSummary = formatSessionSlotsLabel(
    JSON.stringify(slotsToPayload(timeSlots)),
    timeSlots[0]?.start,
    timeSlots[timeSlots.length - 1]?.end,
  );

  const submit = async () => {
    if (!selectedSkill) {
      Alert.alert('Category required', 'Select what type of help you need.');
      return;
    }
    if (bookingType === 'SESSION' && timeSlots.length === 0) {
      Alert.alert('Time slot required', 'Select at least one time slot.');
      return;
    }
    if (!location?.address || location.latitude == null || location.longitude == null) {
      Alert.alert('Location required', 'Allow live location or pick your address on the map.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        bookingType,
        address: location.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes.trim() || undefined,
        requestedSkill: selectedSkill,
      };

      if (bookingType === 'SESSION') {
        const day = new Date(sessionDate);
        day.setHours(12, 0, 0, 0);
        const orderedSlots = slotsToPayload(timeSlots);
        payload.sessionDate = day.toISOString();
        payload.sessionSlots = orderedSlots;
        payload.sessionStartTime = orderedSlots[0].start;
        payload.sessionEndTime = orderedSlots[orderedSlots.length - 1].end;
        payload.sessionHours = orderedSlots.length;
      } else {
        payload.monthlyStartDate = monthlyStart.toISOString();
        payload.monthlyEndDate = monthlyEnd.toISOString();
        payload.hoursPerDay = 8;
        payload.workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      }

      const res = await api.post('/bookings', payload);
      const notified = res.data.data.broadcast?.notifiedServants ?? 0;
      const helperNames = (res.data.data.broadcast?.helperNames as string[] | undefined) ?? [];
      const namesPreview =
        helperNames.length > 0
          ? `\n\nNotified: ${helperNames.slice(0, 3).join(', ')}${helperNames.length > 3 ? ` +${helperNames.length - 3} more` : ''}`
          : '';
      const timePreview =
        bookingType === 'SESSION' && slotsSummary ? `\nTime slots: ${slotsSummary}` : '';
      Alert.alert(
        'Request sent to your area',
        `${skillLabel} · ${requestTypeLabel}${timePreview}\n\n${
          notified > 0
            ? `${notified} verified helper${notified === 1 ? '' : 's'} in your area will see this on their dashboard. The first to accept gets your job.${namesPreview}`
            : 'Your request is saved. Only helpers who serve your area will see it on their dashboard when they come online.'
        }`,
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
        Only verified helpers who serve your location will see this request on their dashboard.
        Whoever accepts first is assigned to you.
      </Text>

      <View style={styles.categoryBox}>
        <Text style={styles.categoryTitle}>Request category</Text>
        <Text style={styles.categoryHint}>What type of help do you need?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.skillRow}
          contentContainerStyle={styles.skillRowContent}
        >
          {skills.map((s) => (
            <TouchableOpacity
              key={s.code}
              style={[styles.skillChip, selectedSkill === s.code && styles.skillChipOn]}
              onPress={() => setSelectedSkill(s.code)}
            >
              <Text style={[styles.skillChipText, selectedSkill === s.code && styles.skillChipTextOn]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedSkill ? (
          <Text style={styles.categorySelected}>
            Sending request for: {skillLabel} · {requestTypeLabel}
            {bookingType === 'SESSION' && slotsSummary ? ` · ${slotsSummary}` : ''}
          </Text>
        ) : null}
      </View>

      {location?.latitude != null && location?.longitude != null && selectedSkill ? (
        <View style={styles.areaBox}>
          <Text style={styles.areaTitle}>
            {nearbyCount > 0
              ? `${nearbyCount} ${skillLabel} helper${nearbyCount === 1 ? '' : 's'} in your area will be notified`
              : `No ${skillLabel.toLowerCase()} helpers in your area right now`}
          </Text>
          {nearbyCount > 0 ? (
            <Text style={styles.areaNames}>
              {nearbyHelpers.map((h) => h.user.name).join(' · ')}
            </Text>
          ) : (
            <Text style={styles.areaNames}>
              Your {skillLabel.toLowerCase()} request stays open until a verified helper in this area comes
              online.
            </Text>
          )}
        </View>
      ) : null}

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
          <TimeSlotPicker
            label="Pick time slots (select multiple)"
            value={timeSlots}
            onChange={setTimeSlots}
          />
        </>
      ) : (
        <Text style={styles.hint}>
          Monthly: {monthlyStart.toLocaleDateString('en-IN')} → {monthlyEnd.toLocaleDateString('en-IN')}
        </Text>
      )}

      <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
      <LocationPicker
        label="Your live location (GPS / map)"
        placeholder={locLoading ? 'Getting location…' : 'Search or use current location'}
        value={location}
        onChange={setLocation}
      />
      <GhostInput label="Notes (optional)" value={notes} onChangeText={setNotes} />

      <GradientButton
        title={
          nearbyCount > 0
            ? `Send ${skillLabel || 'area'} request to ${nearbyCount} helper${nearbyCount === 1 ? '' : 's'}`
            : selectedSkill
              ? `Send ${skillLabel} request`
              : 'Select category to send request'
        }
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
  sub: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginBottom: 20, lineHeight: 20 },
  categoryBox: {
    backgroundColor: Stitch.colors.primaryFixed,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: Stitch.colors.primary },
  categoryHint: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  skillRow: { marginTop: 12, flexGrow: 0 },
  skillRowContent: { alignItems: 'center', paddingVertical: 2 },
  skillChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
    marginRight: 8,
  },
  skillChipOn: { backgroundColor: Stitch.colors.secondary },
  skillChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, lineHeight: 18 },
  skillChipTextOn: { color: '#fff' },
  categorySelected: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.primary,
    lineHeight: 18,
  },
  areaBox: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  areaTitle: { fontSize: 14, fontWeight: '700', color: Stitch.colors.primary },
  areaNames: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
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
