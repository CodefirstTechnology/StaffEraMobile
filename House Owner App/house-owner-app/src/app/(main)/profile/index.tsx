import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Profile</Text>
      <GlassCard>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.city}>{user?.houseOwner?.city || 'Add city when booking'}</Text>
      </GlassCard>
      <GradientButton title="Sign out" variant="outline" onPress={signOut} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background, padding: Stitch.spacing.padding, paddingTop: 56 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: Stitch.colors.onSurfaceVariant, marginTop: 6 },
  city: { marginTop: 8, color: Stitch.colors.secondary, fontWeight: '600' },
});
