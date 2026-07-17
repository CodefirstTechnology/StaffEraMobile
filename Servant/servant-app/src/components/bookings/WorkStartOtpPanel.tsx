import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { useToast } from '@/providers/ToastProvider';
import { workOtpFeedback, workOtpVerifyErrorFeedback } from '@/lib/workOtpFeedback';
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

  const submit = async () => {
    if (disabled) return;
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
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('workOtp.title')}</Text>
      <Text style={styles.sub}>{t('workOtp.sub')}</Text>
      {expiresAt ? (
        <Text style={styles.expires}>{t('workOtp.expiresHint')}</Text>
      ) : null}
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t('workOtp.placeholder')}
        placeholderTextColor={Stitch.colors.onSurfaceVariant}
        editable={!disabled}
      />
      <GradientButton
        title={t('workOtp.verifyStart')}
        onPress={submit}
        loading={loading}
        disabled={disabled}
      />
      <TouchableOpacity style={styles.resend} onPress={resend} disabled={resending || disabled}>
        <Text style={styles.resendText}>
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
  },
  title: { fontSize: 15, fontWeight: '700', color: Stitch.colors.primary },
  sub: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  expires: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
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
  inputDisabled: { opacity: 0.5 },
  resend: { marginTop: 10, alignItems: 'center' },
  resendText: { color: Stitch.colors.primary, fontWeight: '600', fontSize: 13 },
});
