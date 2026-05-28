import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
});

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Login failed', err.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>StaffEra</Text>
        <Text style={styles.subtitle}>Trusted home help for your family</Text>
        <Text style={styles.trust}>{Stitch.copy.trustLine}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <GhostInput
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <GhostInput
              label="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <GradientButton title="Sign in" onPress={handleSubmit(onSubmit)} loading={loading} />

        <Link href="/(auth)/register" asChild>
          <Text style={styles.link}>New here? Create your account</Text>
        </Link>

        <Text style={styles.safe}>{Stitch.copy.safeData}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.surfaceHighest },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(125, 68, 164, 0.08)',
  },
  blob2: {
    position: 'absolute',
    bottom: 40,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  scroll: {
    flexGrow: 1,
    padding: Stitch.spacing.padding,
    paddingTop: 72,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    ...Stitch.typography.headline,
    fontSize: 32,
    color: Stitch.colors.primary,
    marginBottom: 8,
  },
  subtitle: { ...Stitch.typography.body, color: Stitch.colors.onSurfaceVariant, marginBottom: 8 },
  trust: {
    ...Stitch.typography.caption,
    color: Stitch.colors.secondary,
    marginBottom: 28,
    lineHeight: 18,
  },
  link: {
    color: Stitch.colors.primary,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
    fontSize: 15,
  },
  safe: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.8,
  },
});
