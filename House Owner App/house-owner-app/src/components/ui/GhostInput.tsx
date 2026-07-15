import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

type Props = TextInputProps & { label?: string; error?: string; required?: boolean };

export function GhostInput({ label, style, secureTextEntry, error, required, ...props }: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: Stitch.colors.error }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          secureTextEntry={isPassword ? !passwordVisible : secureTextEntry}
          style={[styles.input, isPassword && styles.inputWithIcon, error ? styles.inputError : null, style]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setPasswordVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <MaterialIcons
              name={passwordVisible ? 'visibility-off' : 'visibility'}
              size={22}
              color={Stitch.colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>
      {error && error.trim() ? <Text style={styles.error}>{error}</Text> : null}
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
  inputWrap: { position: 'relative' },
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
  inputError: {
    borderColor: Stitch.colors.error,
  },
  error: {
    fontSize: 12,
    color: Stitch.colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  inputWithIcon: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
