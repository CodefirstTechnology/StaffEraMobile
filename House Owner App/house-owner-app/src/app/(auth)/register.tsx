import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (form.password !== form.confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: form.city,
      });
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Registration failed', err.response?.data?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: 'Full name', secure: false },
    { key: 'email' as const, label: 'Email', secure: false },
    { key: 'phone' as const, label: 'Phone (+91)', secure: false, keyboard: 'phone-pad' as const },
    { key: 'city' as const, label: 'City', secure: false },
    { key: 'password' as const, label: 'Password', secure: true },
    { key: 'confirmPassword' as const, label: 'Confirm password', secure: true },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.logo}>Join StaffEra</Text>
      <Text style={styles.sub}>Book verified help for your home</Text>
      {fields.map((f) => (
        <GhostInput
          key={f.key}
          label={f.label}
          secureTextEntry={f.secure}
          {...('keyboard' in f ? { keyboardType: f.keyboard } : {})}
          autoCapitalize={f.key === 'email' ? 'none' : 'words'}
          value={form[f.key]}
          onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
        />
      ))}
      <GradientButton title="Create account" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 24, marginTop: 8 },
});
