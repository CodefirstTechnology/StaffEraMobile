import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import type { LocationValue } from '@/lib/locationTypes';
import { digitsOnlyPhone, getPhoneValidationKind } from '@/lib/phone';
import { setPendingToast } from '@/lib/pendingToast';
import { te, normalizeApiErrorMessage } from '@/lib/i18n/alertMessages';

function phoneErrorMessage(kind: ReturnType<typeof getPhoneValidationKind>) {
  if (kind === 'required') return te('validation.phoneRequired');
  if (kind === 'invalid') return te('validation.phoneInvalid');
  return '';
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
  });
  const [addressUnit, setAddressUnit] = useState<AddressUnitValue>({
    flatNo: '',
    building: '',
    area: '',
  });
  const [homeLocation, setHomeLocation] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhoneField = (value: string) => {
    const kind = getPhoneValidationKind(value, { required: false });
    const msg = phoneErrorMessage(kind);
    setPhoneError(msg);
    return !kind;
  };

  const submit = async () => {
    if (form.password !== form.confirmPassword) {
      showAlert(te('errors.generic'), te('auth.passwordMismatch'));
      return;
    }
    if (!validatePhoneField(form.phone)) return;
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: digitsOnlyPhone(form.phone) || undefined,
        password: form.password,
        city: homeLocation?.city || form.city,
        address: homeLocation?.address,
        flatNo: addressUnit.flatNo.trim(),
        building: addressUnit.building.trim(),
        area: addressUnit.area.trim(),
        latitude: homeLocation?.latitude,
        longitude: homeLocation?.longitude,
      });
      setPendingToast(t('auth.registrationSuccess'), 'success');
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showAlert(
        te('auth.registrationFailed'),
        normalizeApiErrorMessage(err.response?.data?.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: t('auth.fullName'), secure: false, required: true },
    { key: 'email' as const, label: t('auth.email'), secure: false, required: true },
    { key: 'phone' as const, label: t('auth.phone'), secure: false, keyboard: 'phone-pad' as const },
    { key: 'password' as const, label: t('auth.password'), secure: true, required: true },
    { key: 'confirmPassword' as const, label: t('auth.confirmPassword'), secure: true, required: true },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <LanguageSelector compact showTitle />
      <Text style={styles.logo}>{t('auth.joinTitle')}</Text>
      <Text style={styles.sub}>{t('auth.joinSubtitle')}</Text>
      {fields.map((f) => (
        <View key={f.key}>
          <GhostInput
            label={f.label}
            secureTextEntry={f.secure}
            {...('keyboard' in f ? { keyboardType: f.keyboard } : {})}
            autoCapitalize={f.key === 'email' ? 'none' : 'words'}
            value={form[f.key]}
            error={f.key === 'phone' ? phoneError : undefined}
            onChangeText={(v) => {
              const next = f.key === 'phone' ? digitsOnlyPhone(v) : v;
              setForm((prev) => ({ ...prev, [f.key]: next }));
              if (f.key === 'phone') setPhoneError('');
            }}
            onBlur={
              f.key === 'phone'
                ? () => {
                    validatePhoneField(form.phone);
                  }
                : undefined
            }
            required={f.required}
          />
          {f.key === 'password' ? <PasswordStrengthIndicator password={form.password} /> : null}
        </View>
      ))}

      <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
      <LocationPicker
        label={t('auth.homeLocationOptional')}
        placeholder={t('auth.searchPlaceholder')}
        value={homeLocation}
        onChange={(location) => {
          setHomeLocation(location);
          if (location.city) {
            setForm((prev) => ({ ...prev, city: location.city || prev.city }));
          }
        }}
      />

      {!homeLocation ? (
        <GhostInput
          label={t('auth.cityIfNoLocation')}
          value={form.city}
          onChangeText={(v) => setForm((prev) => ({ ...prev, city: v }))}
        />
      ) : null}

      <GradientButton title={t('auth.createAccount')} onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 24, marginTop: 8 },
});
