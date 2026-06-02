import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stitch } from '@/theme/stitch';
import { HOURLY_TIME_SLOTS, type TimeSlot } from '@/lib/timeSlots';

type Props = {
  label?: string;
  value: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
};

export function TimeSlotPicker({
  label = 'Time slots',
  value,
  onChange,
}: Props) {
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
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>Tap to select multiple slots (1 hour each)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.row}
        contentContainerStyle={styles.rowContent}
      >
        {HOURLY_TIME_SLOTS.map((slot) => {
          const selected = value.some((s) => s.id === slot.id);
          return (
            <TouchableOpacity
              key={slot.id}
              style={[styles.chip, selected && styles.chipOn]}
              onPress={() => toggle(slot)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{slot.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {value.length > 0 ? (
        <Text style={styles.selected}>
          Selected ({value.length}): {value.map((s) => s.label).join(' · ')}
        </Text>
      ) : (
        <Text style={styles.empty}>Pick at least one time slot</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, marginBottom: 4 },
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
  empty: { marginTop: 10, fontSize: 13, color: Stitch.colors.error },
});
