import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getLoginErrorMessage } from '@/lib/getLoginErrorMessage';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(main)/home');
    } catch (e: unknown) {
      Alert.alert('Login failed', getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.badge}>StaffEra Pro</Text>
        <Text style={styles.logo}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in with the email your agent registered. Earn with dignity — on your schedule.
        </Text>

        <GhostInput
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <GhostInput
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <GradientButton title="Sign in" onPress={submit} loading={loading} />

        <Text style={styles.hint}>
          No self-signup. Your agent creates your account and verifies your ID.
        </Text>
        <Text style={styles.trust}>{Stitch.copy.safeData}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.surfaceHighest },
  blob1: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(125, 68, 164, 0.1)',
  },
  blob2: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 72 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Stitch.colors.primaryFixed,
    color: Stitch.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  logo: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  subtitle: {
    fontSize: 16,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 24,
  },
  hint: {
    textAlign: 'center',
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 20,
    fontSize: 13,
    lineHeight: 20,
  },
  trust: {
    textAlign: 'center',
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 24,
    fontSize: 12,
    opacity: 0.75,
  },
});
