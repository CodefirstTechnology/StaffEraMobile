import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';

export const DECLINE_REASON_KEYS = [
  'unavailable',
  'scheduleConflict',
  'tooFar',
  'personalEmergency',
  'other',
] as const;

export type DeclineReasonKey = (typeof DECLINE_REASON_KEYS)[number];

type Props = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function DeclineReasonSheet({ visible, loading, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<DeclineReasonKey | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setCustomReason('');
      setError('');
    }
  }, [visible]);

  const buildReason = (): string | null => {
    if (!selected) {
      setError(t('decline.reasonRequired'));
      return null;
    }
    if (selected === 'other') {
      const text = customReason.trim();
      if (text.length < 3) {
        setError(t('decline.customReasonRequired'));
        return null;
      }
      return text;
    }
    return t(`decline.reasons.${selected}`);
  };

  const submit = () => {
    const reason = buildReason();
    if (!reason) return;
    setError('');
    void onConfirm(reason);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('decline.title')}</Text>
          <Text style={styles.sub}>{t('decline.sub')}</Text>

          <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
            {DECLINE_REASON_KEYS.map((key) => {
              const active = selected === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    setSelected(key);
                    setError('');
                  }}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={active ? Stitch.colors.primary : Stitch.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {t(`decline.reasons.${key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {selected === 'other' ? (
              <TextInput
                style={styles.input}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder={t('decline.customPlaceholder')}
                placeholderTextColor={Stitch.colors.onSurfaceVariant}
                multiline
                maxLength={500}
                editable={!loading}
              />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <GradientButton
              title={loading ? t('common.loading') : t('decline.confirm')}
              onPress={submit}
              loading={loading}
              variant="outline"
              style={styles.declineBtn}
            />
            <GradientButton title={t('common.cancel')} onPress={onClose} disabled={loading} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Stitch.colors.surfaceHighest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Stitch.colors.outlineVariant,
    marginTop: 10,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: Stitch.colors.primary },
  sub: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  options: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Stitch.radius.md,
    marginBottom: 8,
    backgroundColor: Stitch.colors.surfaceLow,
  },
  optionActive: { backgroundColor: Stitch.colors.primaryFixed },
  optionText: { flex: 1, fontSize: 15, color: Stitch.colors.onBackground },
  optionTextActive: { fontWeight: '600', color: Stitch.colors.primary },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
    borderRadius: Stitch.radius.md,
    padding: 12,
    fontSize: 15,
    color: Stitch.colors.onBackground,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  error: { color: Stitch.colors.error, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  actions: { gap: 10, marginTop: 12 },
  declineBtn: { borderColor: Stitch.colors.error },
});
