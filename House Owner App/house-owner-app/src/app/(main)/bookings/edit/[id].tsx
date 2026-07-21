import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { showAlert } from '@/lib/alert';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { BackHeader } from '@/components/ui/BackHeader';
import { GhostInput } from '@/components/ui/GhostInput';
import { BookingLocationSection } from '@/components/ui/BookingLocationSection';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import type { LocationValue } from '@/lib/locationTypes';
import {
  addressUnitFromProfile,
  defaultBookingLocationMode,
  homeLocationFromProfile,
  type BookingLocationMode,
} from '@/lib/homeLocation';
import { useSkills } from '@/hooks/useSkills';
import {
  getDefaultTimeSlotsForDate,
  pruneTimeSlotsForDate,
  slotsToPayload,
  type TimeSlot,
} from '@/lib/timeSlots';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { te, normalizeApiErrorMessage } from '@/lib/i18n/alertMessages';
import {
  validateBookingForm,
  type BookingFieldErrors,
} from '@/lib/bookingValidation';
import { getBookingEditMode, sessionSlotsToTimeSlots } from '@/lib/bookingEdit';
import { setPendingToast } from '@/lib/pendingToast';

type BookingRecord = {
  id: number;
  status: string;
  bookingType: 'SESSION' | 'MONTHLY';
  servantId?: number | null;
  requestedSkill?: string | null;
  sessionDate?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionSlots?: string | null;
  sessionHours?: number | null;
  monthlyStartDate?: string | null;
  monthlyEndDate?: string | null;
  address?: string | null;
  flatNo?: string | null;
  building?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  totalAmount?: number | null;
  servant?: { hourlyRate?: number | null; monthlyRate?: number | null };
};

function bookingLocationFromRecord(booking: BookingRecord): LocationValue | null {
  if (!booking.address || booking.latitude == null || booking.longitude == null) return null;
  return {
    address: booking.address,
    latitude: booking.latitude,
    longitude: booking.longitude,
  };
}

export default function EditBookingScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const ho = user?.houseOwner;
  const { data: skills = [] } = useSkills();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking as BookingRecord;
    },
  });

  const editMode = booking ? getBookingEditMode(booking.status) : 'none';
  const isOpenBroadcast = !booking?.servantId;

  const [hydrated, setHydrated] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [locationMode, setLocationMode] = useState<BookingLocationMode>('home');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [sessionStart, setSessionStart] = useState('09:00');
  const [sessionEnd, setSessionEnd] = useState('13:00');
  const [monthlyStart, setMonthlyStart] = useState(new Date());
  const [monthlyEnd, setMonthlyEnd] = useState(new Date());
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [addressUnit, setAddressUnit] = useState(() => addressUnitFromProfile(ho));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  useEffect(() => {
    if (!booking || hydrated) return;

    setSelectedSkill(booking.requestedSkill ? String(booking.requestedSkill).toUpperCase() : '');
    setNotes(booking.notes || '');
    setAddressUnit({
      flatNo: booking.flatNo || '',
      building: booking.building || '',
      area: booking.area || '',
    });

    const visitLocation = bookingLocationFromRecord(booking);
    if (visitLocation) {
      setLocation(visitLocation);
      setLocationMode('current');
    } else {
      setLocation(homeLocationFromProfile(ho));
      setLocationMode(defaultBookingLocationMode(ho));
    }

    if (booking.bookingType === 'SESSION') {
      if (booking.sessionDate) setSessionDate(new Date(booking.sessionDate));
      if (isOpenBroadcast) {
        setTimeSlots(sessionSlotsToTimeSlots(
          booking.sessionSlots,
          booking.sessionStartTime,
          booking.sessionEndTime,
        ));
      } else {
        setSessionStart(booking.sessionStartTime || '09:00');
        setSessionEnd(booking.sessionEndTime || '13:00');
      }
    } else {
      if (booking.monthlyStartDate) setMonthlyStart(new Date(booking.monthlyStartDate));
      if (booking.monthlyEndDate) setMonthlyEnd(new Date(booking.monthlyEndDate));
    }

    setHydrated(true);
  }, [booking, hydrated, ho, isOpenBroadcast]);

  useEffect(() => {
    if (!isOpenBroadcast || booking?.bookingType !== 'SESSION') return;
    const syncSlots = () =>
      setTimeSlots((prev) => pruneTimeSlotsForDate(prev, sessionDate, new Date()));
    syncSlots();
    const timer = setInterval(syncSlots, 30000);
    return () => clearInterval(timer);
  }, [sessionDate, isOpenBroadcast, booking?.bookingType]);

  const totalAmount =
    booking?.bookingType === 'SESSION'
      ? (booking.servant?.hourlyRate || 0) *
        Math.max(
          1,
          isOpenBroadcast
            ? timeSlots.length
            : (parseInt(sessionEnd.split(':')[0], 10) || 0) -
                (parseInt(sessionStart.split(':')[0], 10) || 0),
        )
      : booking?.servant?.monthlyRate || booking?.totalAmount || 0;

  const submit = async () => {
    if (!booking || !id || editMode === 'none') return;

    if (editMode === 'notes') {
      setLoading(true);
      try {
        await api.patch(`/bookings/${id}`, { notes: notes.trim() || undefined });
        await qc.invalidateQueries({ queryKey: ['bookings'] });
        await qc.invalidateQueries({ queryKey: ['booking', id] });
        setPendingToast(t('bookings.updateSuccess'), 'success');
        router.back();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        showAlert(
          t('bookings.updateFailed'),
          normalizeApiErrorMessage(err.response?.data?.message),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    let sessionSlotsToSend = timeSlots;
    if (editMode === 'full') {
      const { errors, sessionSlotsToSend: slots, valid } = validateBookingForm({
        t,
        bookingType: booking.bookingType,
        requireCategory: isOpenBroadcast,
        selectedSkill,
        useTimeSlotPicker: booking.bookingType === 'SESSION' && isOpenBroadcast,
        timeSlots,
        sessionDate,
        sessionStart,
        sessionEnd,
        location,
        requireLocation: true,
      });

      setFieldErrors(errors);
      if (!valid) {
        showAlert(te('bookings.validationTitle'), te('bookings.fixRequiredFields'));
        return;
      }

      sessionSlotsToSend = slots;
      if (sessionSlotsToSend.length !== timeSlots.length) {
        setTimeSlots(sessionSlotsToSend);
      }
    }

    if (!location) return;
    const visitLocation = location;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        address: visitLocation.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        latitude: visitLocation.latitude,
        longitude: visitLocation.longitude,
        notes: notes.trim() || undefined,
      };

      if (isOpenBroadcast) {
        payload.requestedSkill = selectedSkill;
      } else if (totalAmount) {
        payload.totalAmount = totalAmount;
      }

      if (booking.bookingType === 'SESSION') {
        const day = new Date(sessionDate);
        day.setHours(12, 0, 0, 0);
        payload.sessionDate = day.toISOString();

        if (isOpenBroadcast) {
          const orderedSlots = slotsToPayload(sessionSlotsToSend);
          payload.sessionSlots = orderedSlots;
          payload.sessionStartTime = orderedSlots[0].start;
          payload.sessionEndTime = orderedSlots[orderedSlots.length - 1].end;
          payload.sessionHours = orderedSlots.length;
        } else {
          payload.sessionStartTime = sessionStart;
          payload.sessionEndTime = sessionEnd;
          payload.sessionHours = Math.max(
            1,
            (parseInt(sessionEnd.split(':')[0], 10) || 0) -
              (parseInt(sessionStart.split(':')[0], 10) || 0),
          );
        }
      } else {
        payload.monthlyStartDate = monthlyStart.toISOString();
        payload.monthlyEndDate = monthlyEnd.toISOString();
        payload.hoursPerDay = 8;
        payload.workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      }

      await api.patch(`/bookings/${id}`, payload);
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      await qc.invalidateQueries({ queryKey: ['booking', id] });
      setPendingToast(t('bookings.updateSuccess'), 'success');
      router.back();
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const message = normalizeApiErrorMessage(err.response?.data?.message);
      const title =
        err.response?.status === 409 ? t('bookings.timeNotAvailable') : t('bookings.updateFailed');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.root}>
        <BackHeader title={t('bookings.editBooking')} />
        <View style={styles.center}>
          <Text style={styles.muted}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (editMode === 'none') {
    return (
      <View style={styles.root}>
        <BackHeader title={t('bookings.editBooking')} />
        <View style={styles.center}>
          <Text style={styles.blocked}>{t('bookings.cannotEdit')}</Text>
        </View>
      </View>
    );
  }

  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');

  return (
    <View style={styles.root}>
      <BackHeader title={t('bookings.editBooking')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.typeLabel}>{t('bookings.typeLabel', { type: visitType })}</Text>
        {editMode === 'notes' ? (
          <Text style={styles.hint}>{t('bookings.editNotesOnlyHint')}</Text>
        ) : null}

        {editMode === 'full' && isOpenBroadcast ? (
          <>
            <Text style={styles.section}>
              {t('bookings.requestCategory')}
              <Text style={styles.required}> *</Text>
            </Text>
            <View style={[styles.skillRow, fieldErrors.category ? styles.fieldBoxError : null]}>
              {skills.map((skill) => {
                const code = skill.code;
                const active = selectedSkill === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.skillChip, active && styles.skillChipOn]}
                    onPress={() => {
                      setSelectedSkill(code);
                      setFieldErrors((prev) => ({ ...prev, category: undefined }));
                    }}
                  >
                    <Text style={[styles.skillText, active && styles.skillTextOn]}>
                      {localizedSkillLabel(code, skills)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {fieldErrors.category ? (
              <Text style={styles.fieldError}>{fieldErrors.category}</Text>
            ) : null}
          </>
        ) : null}

        {editMode === 'full' && booking.bookingType === 'SESSION' ? (
          <>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
              <Text style={styles.dateLabel}>{t('bookings.visitDate')}</Text>
              <Text style={styles.dateValue}>{formatDate(sessionDate)}</Text>
            </TouchableOpacity>
            {showDate ? (
              <DateTimePicker
                value={sessionDate}
                mode="date"
                onChange={(_, date) => {
                  setShowDate(false);
                  if (date) {
                    setSessionDate(date);
                    if (isOpenBroadcast) {
                      setTimeSlots(getDefaultTimeSlotsForDate(date));
                    }
                  }
                }}
              />
            ) : null}
            {isOpenBroadcast ? (
              <TimeSlotPicker
                sessionDate={sessionDate}
                value={timeSlots}
                onChange={(slots) => {
                  setTimeSlots(slots);
                  setFieldErrors((prev) => ({ ...prev, timeSlots: undefined }));
                }}
                error={fieldErrors.timeSlots}
                required
              />
            ) : (
              <>
                <GhostInput
                  label={t('bookings.startTime')}
                  value={sessionStart}
                  onChangeText={(text) => {
                    setSessionStart(text);
                    setFieldErrors((prev) => ({ ...prev, sessionStart: undefined }));
                  }}
                  error={fieldErrors.sessionStart}
                  required
                />
                <GhostInput
                  label={t('bookings.endTime')}
                  value={sessionEnd}
                  onChangeText={(text) => {
                    setSessionEnd(text);
                    setFieldErrors((prev) => ({ ...prev, sessionEnd: undefined }));
                  }}
                  error={fieldErrors.sessionEnd}
                  required
                />
              </>
            )}
          </>
        ) : null}

        {editMode === 'full' && booking.bookingType === 'MONTHLY' ? (
          <Text style={styles.hint}>
            {t('bookings.monthlyRange', {
              start: formatDate(monthlyStart),
              end: formatDate(monthlyEnd),
            })}
          </Text>
        ) : null}

        {editMode === 'full' ? (
          <BookingLocationSection
            houseOwner={user?.houseOwner}
            mode={locationMode}
            onModeChange={setLocationMode}
            location={location}
            onLocationChange={(next) => {
              setLocation(next);
              setFieldErrors((prev) => ({ ...prev, location: undefined }));
            }}
            addressUnit={addressUnit}
            onAddressUnitChange={setAddressUnit}
            locationError={fieldErrors.location}
          />
        ) : null}

        <GhostInput
          label={t('bookings.notesOptional')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {editMode === 'full' && !isOpenBroadcast && totalAmount > 0 ? (
          <Text style={styles.estimate}>
            {t('bookings.estimated', {
              amount: `${Stitch.copy.rupee}${formatCurrency(totalAmount)}`,
            })}
          </Text>
        ) : null}

        <GradientButton
          title={t('bookings.saveChanges')}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Stitch.spacing.padding, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: Stitch.colors.onSurfaceVariant },
  blocked: { color: Stitch.colors.error, textAlign: 'center', lineHeight: 22 },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginBottom: 12,
  },
  hint: { marginBottom: 16, color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  section: { fontSize: 13, fontWeight: '700', color: Stitch.colors.onSurfaceVariant, marginBottom: 8 },
  required: { color: Stitch.colors.error },
  fieldBoxError: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Stitch.colors.error,
    backgroundColor: Stitch.colors.error + '08',
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    color: Stitch.colors.error,
    marginBottom: 12,
    lineHeight: 17,
  },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  skillChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Stitch.colors.surfaceContainer,
  },
  skillChipOn: { backgroundColor: Stitch.colors.secondary },
  skillText: { fontWeight: '600', color: Stitch.colors.onSurfaceVariant, fontSize: 13 },
  skillTextOn: { color: '#fff' },
  dateBtn: {
    backgroundColor: Stitch.colors.surfaceLow,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateLabel: { fontSize: 12, color: Stitch.colors.onSurfaceVariant },
  dateValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  estimate: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginVertical: 16,
    textAlign: 'center',
  },
});
