import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { getLoginErrorMessage, normalizeLoginErrorMessage } from '@/lib/getLoginErrorMessage';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');

  const submit = async () => {
    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = t('validation.usernameRequired') || 'Username required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = t('validation.emailInvalid') || 'Enter a valid username (email address)';
    }

    if (!password) {
      newErrors.password = t('validation.passwordRequired') || 'Password required';
    } else if (password.length < 6) {
      newErrors.password = t('validation.passwordMin') || 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError('');
      return;
    }
    setErrors({});
    setFormError('');

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(normalizeLoginErrorMessage(err.response?.data?.message) || getLoginErrorMessage(e));
      setErrors({ email: ' ', password: ' ' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LanguageSelector compact showTitle />
        <Text style={styles.badge}>{t('common.appNamePro')}</Text>
        <Text style={styles.logo}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.servantLoginSubtitle')}</Text>

        <GhostInput
          label={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.email') || 'Username'}
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            setFormError('');
          }}
          error={errors.email}
          required
        />
        <GhostInput
          label={t('auth.password')}
          secureTextEntry
          placeholder={t('auth.password') || 'Password'}
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            setFormError('');
          }}
          error={errors.password}
          required
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <GradientButton title={t('auth.signIn')} onPress={submit} loading={loading} />

        <Link href="/(auth)/register" asChild>
          <Text style={styles.link}>{t('auth.servantNewAccount')}</Text>
        </Link>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.surfaceHighest },
  blob1: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(125, 68, 164, 0.1)',
  },
  blob2: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 72 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Stitch.colors.primaryFixed,
    color: Stitch.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  logo: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  subtitle: {
    fontSize: 16,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 24,
  },
  link: {
    textAlign: 'center',
    color: Stitch.colors.secondary,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
  formError: {
    color: Stitch.colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
});
