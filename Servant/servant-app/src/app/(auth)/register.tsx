import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { useSkills } from '@/hooks/useSkills';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { SkillSelect } from '@/components/ui/SkillSelect';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import type { LocationValue } from '@/lib/locationTypes';

import { digitsOnlyPhone, getPhoneValidationKind } from '@/lib/phone';

function phoneErrorMessage(
  kind: ReturnType<typeof getPhoneValidationKind>,
  t: (key: string) => string,
) {
  if (kind === 'required') return t('validation.mobileRequired');
  if (kind === 'invalid') return t('auth.mobileInvalid');
  return '';
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const submitApplication = useAuthStore((s) => s.submitApplication);
  const {
    data: skills = [],
    isLoading: skillsLoading,
    isError: skillsError,
    refetch: refetchSkills,
  } = useSkills();
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    skills: [] as string[],
    addressText: '',
    city: '',
  });
  const [homeLocation, setHomeLocation] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    skills?: string;
    addressText?: string;
    city?: string;
  }>({});
  const [formError, setFormError] = useState('');

  const validatePhoneField = (value: string) => {
    const kind = getPhoneValidationKind(value, { required: true });
    const msg = phoneErrorMessage(kind, t);
    setErrors((prev) => ({ ...prev, phone: msg || undefined }));
    return !kind;
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    const name = form.name.trim();
    if (!name) {
      newErrors.name = t('validation.nameMin') || 'Full name is required';
    } else if (name.length < 2) {
      newErrors.name = t('validation.nameMin') || 'Name must be at least 2 characters';
    }

    const email = form.email.trim();
    if (!email) {
      newErrors.email = t('validation.usernameRequired') || 'Username required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('validation.emailInvalid') || 'Enter a valid username (email address)';
    }

    const phoneKind = getPhoneValidationKind(form.phone, { required: true });
    if (phoneKind) {
      newErrors.phone = phoneErrorMessage(phoneKind, t);
    }

    if (skillsError || skills.length === 0) {
      newErrors.skills = t('auth.skillsUnavailable') || 'Skills could not be loaded';
    } else if (form.skills.length === 0) {
      newErrors.skills = t('auth.skillRequired') || 'Please select at least one skill';
    }

    const address = homeLocation?.address?.trim() || form.addressText.trim();
    if (!address) {
      newErrors.addressText = t('auth.addressRequired') || 'Address is required';
    } else if (address.length < 5) {
      newErrors.addressText = 'Address must be at least 5 characters';
    }

    if (!homeLocation && !form.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);

    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
      const fieldOrder: Array<keyof typeof newErrors> = [
        'name',
        'email',
        'phone',
        'skills',
        'addressText',
        'city',
      ];
      const firstErrorKey = fieldOrder.find((key) => newErrors[key]);
      if (firstErrorKey && fieldPositions.current[firstErrorKey] !== undefined) {
        const targetY = Math.max(0, fieldPositions.current[firstErrorKey] - 40);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: targetY,
            animated: true,
          });
        }, 50);
      }
    }

    return !hasErrors;
  };

  const submit = async () => {
    if (!validate()) {
      return;
    }

    const address = homeLocation?.address?.trim() || form.addressText.trim();
    const phone = digitsOnlyPhone(form.phone);

    setLoading(true);
    setFormError('');
    try {
      const email = form.email.trim().toLowerCase();
      await submitApplication({
        name: form.name.trim(),
        email,
        phone,
        skills: form.skills,
        address,
        city: homeLocation?.city || form.city.trim() || undefined,
        latitude: homeLocation?.latitude,
        longitude: homeLocation?.longitude,
      });
      setSubmittedEmail(email);
      setSubmitted(true);
    } catch (e: unknown) {
      const errorMsg = getApiErrorMessage(e, 'auth.tryAgain');
      if (
        errorMsg.includes('already active') ||
        errorMsg.includes('already registered') ||
        errorMsg.includes('already exists')
      ) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already registered.',
        }));
        if (fieldPositions.current['email'] !== undefined) {
          const targetY = Math.max(0, fieldPositions.current['email'] - 40);
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: targetY,
              animated: true,
            });
          }, 50);
        }
      } else {
        setFormError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: t('auth.fullName'), required: true },
    { key: 'email' as const, label: t('auth.email'), required: true },
    { key: 'phone' as const, label: t('auth.mobile'), keyboard: 'phone-pad' as const, required: true },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.root}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <LanguageSelector compact showTitle />
        <Text style={styles.logo}>{t('auth.servantJoinTitle')}</Text>
        <Text style={styles.sub}>{t('auth.servantJoinSubtitle')}</Text>

        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>{t('auth.registrationSuccess')}</Text>
            <Text style={styles.successBody}>{t('auth.registrationAgentContact')}</Text>
            {submittedEmail ? (
              <Text style={styles.successEmail}>
                {t('auth.registrationEmailNote', { email: submittedEmail })}
              </Text>
            ) : null}
            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}>{t('auth.goToSignIn')}</Text>
            </Link>
          </View>
        ) : (
          <View>
            {fields.map((f) => (
              <View
                key={f.key}
                onLayout={(e) => {
                  fieldPositions.current[f.key] = e.nativeEvent.layout.y;
                }}
              >
                <GhostInput
                  label={f.label}
                  {...('keyboard' in f ? { keyboardType: f.keyboard } : {})}
                  autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                  value={form[f.key]}
                  error={errors[f.key]}
                  required={f.required}
                  onChangeText={(v) => {
                    const next = f.key === 'phone' ? digitsOnlyPhone(v) : v;
                    setForm((prev) => ({ ...prev, [f.key]: next }));
                    if (errors[f.key]) setErrors((prev) => ({ ...prev, [f.key]: undefined }));
                    if (formError) setFormError('');
                  }}
                  onBlur={
                    f.key === 'phone'
                      ? () => {
                          validatePhoneField(form.phone);
                        }
                      : undefined
                  }
                />
              </View>
            ))}

            <View
              onLayout={(e) => {
                fieldPositions.current['skills'] = e.nativeEvent.layout.y;
              }}
            >
              <SkillSelect
                label={t('auth.skills')}
                placeholder={t('auth.selectSkills')}
                skills={skills}
                loading={skillsLoading}
                value={form.skills}
                onChange={(skillsSelected) => {
                  setForm((prev) => ({ ...prev, skills: skillsSelected }));
                  if (errors.skills) setErrors((prev) => ({ ...prev, skills: undefined }));
                  if (formError) setFormError('');
                }}
              />
              {errors.skills ? <Text style={styles.inlineError}>{errors.skills}</Text> : null}
              {skillsError && !skillsLoading ? (
                <Pressable onPress={() => refetchSkills()}>
                  <Text style={styles.skillsError}>
                    {t('auth.skillsUnavailable')} {t('auth.tapToRetry')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <LocationPicker
              label={t('auth.address')}
              placeholder={t('auth.searchPlaceholder')}
              value={homeLocation}
              onChange={(location) => {
                setHomeLocation(location);
                setForm((prev) => ({
                  ...prev,
                  addressText: location.address,
                  city: location.city || prev.city,
                }));
                if (errors.addressText) setErrors((prev) => ({ ...prev, addressText: undefined }));
                if (formError) setFormError('');
              }}
            />

            <View
              onLayout={(e) => {
                fieldPositions.current['addressText'] = e.nativeEvent.layout.y;
              }}
            >
              <GhostInput
                label={t('auth.addressManual')}
                placeholder={t('auth.addressManualPlaceholder')}
                value={form.addressText}
                onChangeText={(v) => {
                  setForm((prev) => ({ ...prev, addressText: v }));
                  if (errors.addressText) setErrors((prev) => ({ ...prev, addressText: undefined }));
                  if (formError) setFormError('');
                }}
                error={errors.addressText}
                multiline
                style={styles.addressInput}
                required
              />
            </View>

            {!homeLocation ? (
              <View
                onLayout={(e) => {
                  fieldPositions.current['city'] = e.nativeEvent.layout.y;
                }}
              >
                <GhostInput
                  label={t('auth.cityIfNoLocation')}
                  value={form.city}
                  onChangeText={(v) => {
                    setForm((prev) => ({ ...prev, city: v }));
                    if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                    if (formError) setFormError('');
                  }}
                  error={errors.city}
                  required
                />
              </View>
            ) : null}

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <GradientButton title={t('auth.register')} onPress={submit} loading={loading} />

            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}>{t('auth.alreadyHaveAccount')}</Text>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { color: Stitch.colors.onSurfaceVariant, marginTop: 8, marginBottom: 24 },
  addressInput: { minHeight: 88, textAlignVertical: 'top' },
  skillsError: {
    fontSize: 13,
    color: Stitch.colors.error,
    marginTop: -8,
    marginBottom: Stitch.spacing.gutter,
    textAlign: 'center',
  },
  inlineError: {
    fontSize: 12,
    color: Stitch.colors.error,
    marginTop: -8,
    marginBottom: Stitch.spacing.gutter,
    marginLeft: 4,
  },
  formError: {
    color: Stitch.colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 4,
    textAlign: 'center',
  },
  successCard: {
    backgroundColor: Stitch.colors.primaryFixed,
    borderRadius: Stitch.radius.xl,
    padding: Stitch.spacing.padding,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  successIcon: { fontSize: 40, color: Stitch.colors.primary, fontWeight: '700' },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Stitch.colors.primary,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    color: Stitch.colors.onBackground,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  successEmail: {
    fontSize: 13,
    color: Stitch.colors.secondary,
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    color: Stitch.colors.secondary,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
});
