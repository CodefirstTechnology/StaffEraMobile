import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { useToast } from '@/providers/ToastProvider';
import { workOtpFeedback, workOtpVerifyErrorFeedback } from '@/lib/workOtpFeedback';
import { useOtpCountdown } from '@/hooks/useOtpCountdown';
import api from '@/lib/api';

type Props = {
  bookingId: number;
  expiresAt?: string | null;
  onVerified: () => void;
  onResend: () => void;
  disabled?: boolean;
};

export function WorkStartOtpPanel({ bookingId, expiresAt, onVerified, onResend, disabled }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { formattedTime, isExpired } = useOtpCountdown({ expiresAt });

  const submit = async () => {
    if (disabled || isExpired) return;
    if (!/^\d{4}$/.test(otp)) {
      const { message, type } = workOtpFeedback('invalid', t);
      toast.show(message, type);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/verify-work-otp`, { otp });
      setOtp('');
      onVerified();
      const { message, type } = workOtpFeedback('success', t);
      toast.show(message, type);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const { message, type } = workOtpVerifyErrorFeedback(t, err.response?.data?.message);
      toast.show(message, type);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (disabled) return;
    setResending(true);
    try {
      await api.post(`/bookings/${bookingId}/resend-work-otp`);
      onResend();
      toast.info(t('workOtp.resentBody'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const { message, type } = workOtpVerifyErrorFeedback(t, err.response?.data?.message);
      toast.show(message, type);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.wrap, isExpired && styles.wrapExpired]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('workOtp.title')}</Text>
        <View style={[styles.timerBadge, isExpired && styles.timerBadgeExpired]}>
          <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
            ⏱️ {isExpired ? 'Expired' : formattedTime}
          </Text>
        </View>
      </View>
      <Text style={styles.sub}>{t('workOtp.sub')}</Text>

      <Text style={[styles.expires, isExpired && styles.expiresExpired]}>
        {isExpired
          ? (t('workOtp.expiredHint') || 'OTP expired. Tap below to send a new code.')
          : t('workOtp.expiresHint', { time: formattedTime })}
      </Text>

      <TextInput
        style={[styles.input, (disabled || isExpired) && styles.inputDisabled]}
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t('workOtp.placeholder')}
        placeholderTextColor={Stitch.colors.onSurfaceVariant}
        editable={!disabled && !isExpired}
      />

      <GradientButton
        title={t('workOtp.verifyStart')}
        onPress={submit}
        loading={loading}
        disabled={disabled || isExpired}
      />

      <TouchableOpacity
        style={[styles.resend, isExpired && styles.resendHighlight]}
        onPress={resend}
        disabled={resending || disabled}
      >
        <Text style={[styles.resendText, isExpired && styles.resendTextHighlight]}>
          {resending ? t('workOtp.resending') : t('workOtp.resend')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    borderWidth: 1,
    borderColor: Stitch.colors.secondary,
  },
  wrapExpired: {
    backgroundColor: '#fff5f5',
    borderColor: Stitch.colors.error,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: Stitch.colors.primary, flex: 1 },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Stitch.colors.secondary,
  },
  timerBadgeExpired: {
    backgroundColor: '#ffebee',
    borderColor: Stitch.colors.error,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: Stitch.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timerTextExpired: {
    color: Stitch.colors.error,
  },
  sub: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  expires: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
    marginTop: 6,
  },
  expiresExpired: {
    color: Stitch.colors.error,
  },
  input: {
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    color: Stitch.colors.primary,
  },
  inputDisabled: { opacity: 0.5, backgroundColor: '#f0f0f0' },
  resend: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  resendHighlight: {
    backgroundColor: Stitch.colors.primaryFixed,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resendText: { color: Stitch.colors.primary, fontWeight: '600', fontSize: 13 },
  resendTextHighlight: { fontWeight: '700', color: Stitch.colors.primary },
});
