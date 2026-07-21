import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import {
  getAvailableTimeSlots,
  isSameLocalDay,
  localizedSlotLabels,
  localizedTimeSlotLabel,
  type TimeSlot,
} from '@/lib/timeSlots';

type Props = {
  label?: string;
  value: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  sessionDate: Date;
  error?: string;
  required?: boolean;
};

export function TimeSlotPicker({ label, value, onChange, sessionDate, error, required }: Props) {
  const { t } = useTranslation();
  const pickerLabel = label ?? t('bookings.timeSlotLabel');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    if (!isSameLocalDay(sessionDate, new Date())) return;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [sessionDate]);

  const availableSlots = useMemo(
    () => getAvailableTimeSlots(sessionDate, now),
    [sessionDate, now],
  );

  const toggle = (slot: TimeSlot) => {
    const exists = value.some((s) => s.id === slot.id);
    const next = exists
      ? value.filter((s) => s.id !== slot.id)
      : [...value, slot].sort(
          (a, b) =>
            parseInt(a.start.split(':')[0], 10) - parseInt(b.start.split(':')[0], 10),
        );
    onChange(next);
  };

  return (
    <View style={[styles.wrap, error ? styles.wrapError : null]}>
      <Text style={styles.label}>
        {pickerLabel}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Text style={styles.hint}>{t('timeSlots.hint')}</Text>
      {availableSlots.length === 0 ? (
        <Text style={styles.empty}>{t('timeSlots.noneLeftToday')}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.row}
          contentContainerStyle={styles.rowContent}
        >
          {availableSlots.map((slot) => {
            const selected = value.some((s) => s.id === slot.id);
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.chip, selected && styles.chipOn]}
                onPress={() => toggle(slot)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {localizedTimeSlotLabel(slot.start, slot.end)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {value.length > 0 ? (
        <Text style={styles.selected}>
          {t('timeSlots.selected', {
            count: value.length,
            labels: localizedSlotLabels(value),
          })}
        </Text>
      ) : availableSlots.length > 0 && !error ? (
        <Text style={styles.hintEmpty}>{t('timeSlots.pickAtLeastOne')}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 2,
  },
  wrapError: {
    borderColor: Stitch.colors.error,
    backgroundColor: Stitch.colors.error + '08',
    padding: 10,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, marginBottom: 4 },
  required: { color: Stitch.colors.error },
  hint: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginBottom: 10 },
  row: { flexGrow: 0, marginBottom: 4 },
  rowContent: { alignItems: 'center', paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
    marginRight: 8,
  },
  chipOn: { backgroundColor: Stitch.colors.secondary },
  chipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  chipTextOn: { color: '#fff' },
  selected: { marginTop: 10, fontSize: 13, color: Stitch.colors.primary, fontWeight: '600', lineHeight: 18 },
  hintEmpty: { marginTop: 10, fontSize: 13, color: Stitch.colors.onSurfaceVariant },
  empty: { marginTop: 10, fontSize: 13, color: Stitch.colors.error },
  error: { marginTop: 8, fontSize: 12, color: Stitch.colors.error, lineHeight: 17 },
});
