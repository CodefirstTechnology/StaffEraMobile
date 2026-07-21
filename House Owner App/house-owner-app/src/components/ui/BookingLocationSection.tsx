import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { LocationPicker } from '@/components/ui/LocationPicker';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import type { LocationValue } from '@/lib/locationTypes';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import {
  addressUnitFromProfile,
  hasSavedHomeAddress,
  homeLocationFromProfile,
  type BookingLocationMode,
  type HouseOwnerProfile,
} from '@/lib/homeLocation';
import { formatVisitAddressLines } from '@/lib/visitAddress';

type Props = {
  houseOwner?: HouseOwnerProfile | null;
  mode: BookingLocationMode;
  onModeChange: (mode: BookingLocationMode) => void;
  location: LocationValue | null;
  onLocationChange: (location: LocationValue | null) => void;
  addressUnit: AddressUnitValue;
  onAddressUnitChange: (value: AddressUnitValue) => void;
  locationError?: string;
};

export function BookingLocationSection({
  houseOwner,
  mode,
  onModeChange,
  location,
  onLocationChange,
  addressUnit,
  onAddressUnitChange,
  locationError,
}: Props) {
  const { t } = useTranslation();
  const { location: liveLocation, loading: locLoading, error: locError } = useLiveLocation();
  const savedHome = homeLocationFromProfile(houseOwner);
  const hasHome = hasSavedHomeAddress(houseOwner);

  useEffect(() => {
    if (mode !== 'current' || !liveLocation) return;
    onLocationChange(liveLocation);
  }, [mode, liveLocation?.latitude, liveLocation?.longitude]);

  const selectMode = (next: BookingLocationMode) => {
    onModeChange(next);
    if (next === 'home' && savedHome) {
      onLocationChange(savedHome);
      onAddressUnitChange(addressUnitFromProfile(houseOwner));
      return;
    }
    if (next === 'current' && liveLocation) {
      onLocationChange(liveLocation);
    }
  };

  const homeLines = savedHome
    ? formatVisitAddressLines({
        flatNo: addressUnit.flatNo || houseOwner?.flatNo,
        building: addressUnit.building || houseOwner?.building,
        area: addressUnit.area || houseOwner?.area,
        address: savedHome.address,
      })
    : [];

  return (
    <View style={[styles.wrap, locationError ? styles.wrapError : null]}>
      <Text style={styles.sectionLabel}>
        {t('bookings.bookingLocation')}
        <Text style={styles.required}> *</Text>
      </Text>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'home' && styles.toggleOn, !hasHome && styles.toggleDisabled]}
          onPress={() => hasHome && selectMode('home')}
          disabled={!hasHome}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="home"
            size={18}
            color={mode === 'home' ? '#fff' : Stitch.colors.onSurfaceVariant}
          />
          <Text style={[styles.toggleText, mode === 'home' && styles.toggleTextOn]}>
            {t('bookings.useHomeAddress')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'current' && styles.toggleOn]}
          onPress={() => selectMode('current')}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="my-location"
            size={18}
            color={mode === 'current' ? '#fff' : Stitch.colors.onSurfaceVariant}
          />
          <Text style={[styles.toggleText, mode === 'current' && styles.toggleTextOn]}>
            {t('bookings.useCurrentLocation')}
          </Text>
        </TouchableOpacity>
      </View>

      {!hasHome ? (
        <TouchableOpacity
          style={styles.noHomeBanner}
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.85}
        >
          <MaterialIcons name="info-outline" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.noHomeText}>{t('bookings.setHomeInProfile')}</Text>
          <MaterialIcons name="chevron-right" size={20} color={Stitch.colors.secondary} />
        </TouchableOpacity>
      ) : null}

      {mode === 'home' && savedHome ? (
        <View style={[styles.homeCard, locationError ? styles.homeCardError : null]}>
          <View style={styles.homeCardHead}>
            <MaterialIcons name="home" size={20} color={Stitch.colors.secondary} />
            <Text style={styles.homeCardTitle}>{t('bookings.savedHomeHint')}</Text>
          </View>
          <Text style={styles.homeAddress}>
            {homeLines.length > 0 ? homeLines.join('\n') : savedHome.address}
          </Text>
          {savedHome.city ? (
            <Text style={styles.homeCity}>{savedHome.city}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.editProfileLink}
            onPress={() => router.push('/(main)/profile')}
            hitSlop={8}
          >
            <Text style={styles.editProfileText}>{t('bookings.editHomeInProfile')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {locError ? <Text style={styles.errorText}>{locError}</Text> : null}
          <LocationPicker
            label={t('bookings.liveLocationLabel')}
            placeholder={
              locLoading ? t('bookings.gettingLocation') : t('bookings.liveLocationPlaceholder')
            }
            value={location}
            onChange={onLocationChange}
            error={locationError}
          />
          <Text style={styles.hint}>{t('bookings.currentLocationHint')}</Text>
        </>
      )}

      <AddressUnitFields value={addressUnit} onChange={onAddressUnitChange} />
      {locationError ? <Text style={styles.fieldError}>{locationError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 2,
  },
  wrapError: {
    borderColor: Stitch.colors.error,
    backgroundColor: Stitch.colors.error + '08',
    padding: 10,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
    marginBottom: 12,
  },
  required: { color: Stitch.colors.error },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Stitch.colors.surfaceContainer,
  },
  toggleOn: { backgroundColor: Stitch.colors.secondary },
  toggleDisabled: { opacity: 0.45 },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  toggleTextOn: { color: '#fff' },
  noHomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Stitch.colors.primaryFixed,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noHomeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.primary,
    lineHeight: 18,
  },
  homeCard: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant + '55',
  },
  homeCardError: {
    borderColor: Stitch.colors.error,
  },
  homeCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  homeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
  homeAddress: {
    fontSize: 14,
    color: Stitch.colors.onBackground,
    lineHeight: 20,
  },
  homeCity: {
    marginTop: 4,
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
  },
  editProfileLink: { marginTop: 10, alignSelf: 'flex-start' },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
  hint: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: -4,
    marginBottom: 8,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 13,
    color: Stitch.colors.error,
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    color: Stitch.colors.error,
    marginTop: 4,
    lineHeight: 17,
  },
});
