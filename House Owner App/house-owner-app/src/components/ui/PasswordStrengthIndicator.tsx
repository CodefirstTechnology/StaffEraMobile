import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { getPasswordStrength } from '@/lib/passwordStrength';

type Props = {
  password: string;
};

const LEVEL_COLORS = {
  tooShort: Stitch.colors.error,
  weak: Stitch.colors.error,
  medium: '#d97706',
  strong: Stitch.colors.success,
} as const;

export function PasswordStrengthIndicator({ password }: Props) {
  const { t } = useTranslation();
  const strength = getPasswordStrength(password);

  if (strength.level === 'empty') return null;

  const labelKey =
    strength.level === 'tooShort'
      ? 'auth.passwordStrength.tooShort'
      : strength.level === 'weak'
        ? 'auth.passwordStrength.weak'
        : strength.level === 'medium'
          ? 'auth.passwordStrength.medium'
          : 'auth.passwordStrength.strong';

  const activeColor =
    strength.level === 'medium'
      ? LEVEL_COLORS.medium
      : strength.level === 'strong'
        ? LEVEL_COLORS.strong
        : LEVEL_COLORS.weak;

  const filledBars =
    strength.level === 'tooShort' ? 1 : strength.level === 'weak' ? 2 : strength.level === 'medium' ? 3 : 4;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.bar,
              index < filledBars ? { backgroundColor: activeColor } : styles.barInactive,
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: activeColor }]}>{t(labelKey)}</Text>
      <View style={styles.hints}>
        <Hint ok={strength.hasMinLength} label={t('auth.passwordStrength.minLength')} />
        <Hint ok={strength.hasUpper} label={t('auth.passwordStrength.upper')} />
        <Hint ok={strength.hasLower} label={t('auth.passwordStrength.lower')} />
        <Hint ok={strength.hasDigit} label={t('auth.passwordStrength.digit')} />
        <Hint ok={strength.hasSpecial} label={t('auth.passwordStrength.special')} />
      </View>
    </View>
  );
}

function Hint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={[styles.hint, ok ? styles.hintOk : styles.hintPending]}>
      {ok ? '✓' : '○'} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -4,
    marginBottom: Stitch.spacing.gutter,
    marginLeft: 4,
  },
  barRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barInactive: {
    backgroundColor: Stitch.colors.outlineVariant,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  hints: {
    gap: 4,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
  },
  hintOk: {
    color: Stitch.colors.success,
  },
  hintPending: {
    color: Stitch.colors.onSurfaceVariant,
  },
});
