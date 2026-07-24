import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { showAlert } from '@/lib/alert';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { BackHeader } from '@/components/ui/BackHeader';
import { GhostInput } from '@/components/ui/GhostInput';
import { BookingLocationSection } from '@/components/ui/BookingLocationSection';
import type { LocationValue } from '@/lib/locationTypes';
import {
  addressUnitFromProfile,
  defaultBookingLocationMode,
  homeLocationFromProfile,
  type BookingLocationMode,
} from '@/lib/homeLocation';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { te, normalizeApiErrorMessage } from '@/lib/i18n/alertMessages';
import {
  validateBookingForm,
  type BookingFieldErrors,
} from '@/lib/bookingValidation';

export default function NewBookingScreen() {
  const { t } = useTranslation();
  const { servantId } = useLocalSearchParams<{ servantId: string }>();
  const user = useAuthStore((s) => s.user);
  const ho = user?.houseOwner;
  const [locationMode, setLocationMode] = useState<BookingLocationMode>(() =>
    defaultBookingLocationMode(ho),
  );
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
  const [location, setLocation] = useState<LocationValue | null>(() => homeLocationFromProfile(ho));
  const [addressUnit, setAddressUnit] = useState(() => addressUnitFromProfile(ho));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  useEffect(() => {
    const profile = user?.houseOwner;
    if (!profile) return;
    if (defaultBookingLocationMode(profile) === 'home') {
      const home = homeLocationFromProfile(profile);
      if (home) {
        setLocationMode('home');
        setLocation(home);
        setAddressUnit(addressUnitFromProfile(profile));
      }
    }
  }, [user?.houseOwner?.address, user?.houseOwner?.latitude, user?.houseOwner?.longitude]);

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
      showAlert(t('bookings.requestFailed'), t('bookings.selectHelperFirst'));
      return;
    }

    const { errors, valid } = validateBookingForm({
      t,
      bookingType,
      requireCategory: false,
      useTimeSlotPicker: false,
      timeSlots: [],
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

    if (!location) return;
    const visitLocation = location;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        servantId: Number(servantId),
        bookingType,
        address: visitLocation.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        latitude: visitLocation.latitude,
        longitude: visitLocation.longitude,
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
      showAlert(t('bookings.requestSent'), t('bookings.requestSentSub'));
      router.replace(`/(main)/bookings/${res.data.data.booking.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const message = normalizeApiErrorMessage(err.response?.data?.message);
      const title =
        err.response?.status === 409
          ? t('bookings.timeNotAvailable')
          : t('bookings.bookingFailed');
      const buttons =
        err.response?.status === 409
          ? [
              { text: t('bookings.changeTime'), style: 'cancel' as const },
              {
        sessionDate: bookingType === 'SESSION' ? sessionDate.toISOString() : undefined,
        sessionStartTime: bookingType === 'SESSION' ? sessionStart : undefined,
        sessionEndTime: bookingType === 'SESSION' ? sessionEnd : undefined,
        sessionHours: bookingType === 'SESSION' ? hours : undefined,
        monthlyStartDate: bookingType === 'MONTHLY' ? monthlyStart.toISOString() : undefined,
        monthlyEndDate: bookingType === 'MONTHLY' ? monthlyEnd.toISOString() : undefined,
        address: location.address,
        flatNo: addressUnit.flatNo || undefined,
        building: addressUnit.building || undefined,
        area: location.area || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        totalAmount,
        notes: notes || undefined,
      });

      showAlert(t('bookings.bookingCreated'), t('bookings.bookingCreatedBody'), [
        { text: t('common.ok'), onPress: () => router.replace('/(main)/bookings') },
      ]);
    } catch (err: unknown) {
      showAlert(t('bookings.requestFailed'), te(t, err, 'bookings.requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <BackHeader title={t('bookings.bookHelperTitle', { name: servant?.user?.name || t('common.helper') })} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      <View style={styles.toggle}>
        {(['SESSION', 'MONTHLY'] as const).map((bt) => (
          <TouchableOpacity
            key={bt}
            style={[styles.toggleBtn, bookingType === bt && styles.toggleOn]}
            onPress={() => setBookingType(bt)}
          >
            <Text style={[styles.toggleText, bookingType === bt && styles.toggleTextOn]}>
              {bt === 'SESSION' ? t('common.oneVisit') : t('common.monthly')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {bookingType === 'SESSION' ? (
        <>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
            <Text style={styles.dateLabel}>{t('bookings.visitDate')}</Text>
            <Text style={styles.dateValue}>{formatDate(sessionDate)}</Text>
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
      ) : (
        <>
          <Text style={styles.hint}>
            {t('bookings.monthlyRange', {
              start: formatDate(monthlyStart),
              end: formatDate(monthlyEnd),
            })}
          </Text>
        </>
      )}

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
      <GhostInput label={t('bookings.notesOptional')} value={notes} onChangeText={setNotes} />

      <View style={styles.priceCard}>
        <Text style={styles.priceCardTitle}>Calculated Price Breakdown</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>
            Helper Rate ({bookingType === 'SESSION' ? `${hours} hrs × ${Stitch.copy.rupee}${servant?.hourlyRate || 0}` : `${Stitch.copy.rupee}${servant?.monthlyRate || 0}/mo`})
          </Text>
          <Text style={styles.priceValue}>{Stitch.copy.rupee}{formatCurrency(baseSubtotal)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Service Fee ({feePct}%)</Text>
          <Text style={styles.priceFee}>+{Stitch.copy.rupee}{formatCurrency(platformFee)}</Text>
        </View>
        <View style={[styles.priceRow, styles.priceTotalRow]}>
          <Text style={styles.priceTotalLabel}>Total Price</Text>
          <Text style={styles.priceTotalValue}>{Stitch.copy.rupee}{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <GradientButton title={t('bookings.sendBookingRequest')} onPress={submit} loading={loading} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Stitch.spacing.padding, paddingBottom: 40 },
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
  priceCard: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  priceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.onBackground,
  },
  priceFee: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
  priceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 0,
  },
  priceTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Stitch.colors.secondary,
  },
});
