import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { useOtpCountdown } from '@/hooks/useOtpCountdown';

type Props = {
  code: string;
  expiresAt?: string | null;
  helperName?: string;
};

export function WorkStartOtpCard({ code, expiresAt, helperName }: Props) {
  const { t } = useTranslation();
  const { formattedTime, isExpired } = useOtpCountdown({ expiresAt });

  return (
    <GlassCard style={[styles.card, isExpired && styles.cardExpired]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>{t('workOtp.homeKicker')}</Text>
          <Text style={styles.title}>{t('workOtp.homeTitle')}</Text>
        </View>
        <View style={[styles.timerBadge, isExpired && styles.timerBadgeExpired]}>
          <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
            ⏱️ {isExpired ? 'Expired' : formattedTime}
          </Text>
        </View>
      </View>

      {helperName ? (
        <Text style={styles.helper}>{t('workOtp.homeHelper', { name: helperName })}</Text>
      ) : null}

      <View style={[styles.codeBox, isExpired && styles.codeBoxExpired]}>
        <Text style={[styles.code, isExpired && styles.codeExpired]}>{code}</Text>
      </View>

      <Text style={[styles.hint, isExpired && styles.hintExpired]}>
        {isExpired
          ? t('workOtp.expired')
          : `${t('workOtp.homeHint')} (${t('workOtp.expiresIn', { time: formattedTime })})`}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Stitch.colors.secondary,
  },
  cardExpired: {
    borderColor: Stitch.colors.error,
    backgroundColor: '#fff5f5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginTop: 4,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Stitch.colors.primaryFixed,
    borderWidth: 1,
    borderColor: Stitch.colors.secondary,
  },
  timerBadgeExpired: {
    backgroundColor: '#ffebee',
    borderColor: Stitch.colors.error,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: Stitch.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timerTextExpired: {
    color: Stitch.colors.error,
  },
  helper: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 6,
  },
  codeBox: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
  },
  codeBoxExpired: {
    backgroundColor: '#f5f5f5',
  },
  code: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    color: Stitch.colors.primary,
  },
  codeExpired: {
    color: Stitch.colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  hintExpired: {
    color: Stitch.colors.error,
    fontWeight: '600',
  },
});
