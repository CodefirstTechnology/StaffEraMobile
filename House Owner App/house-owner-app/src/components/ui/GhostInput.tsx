import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Stitch } from '@/theme/stitch';

type Props = TextInputProps & { label: string };

export function GhostInput({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Stitch.spacing.gutter },
  label: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Stitch.colors.onBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
