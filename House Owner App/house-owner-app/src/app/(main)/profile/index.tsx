import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LocationMapPreview } from '@/components/ui/LocationMapPreview';
import { updateHomeLocation } from '@/lib/geo';
import type { LocationValue } from '@/lib/locationTypes';

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ho = user?.houseOwner;
    if (ho?.latitude != null && ho?.longitude != null && ho.address) {
      setLocation({
        address: ho.address,
        city: ho.city,
        latitude: ho.latitude,
        longitude: ho.longitude,
      });
    }
  }, [user?.houseOwner]);

  const saveLocation = async () => {
    if (!location) {
      Alert.alert('Location required', 'Pick your home location first.');
      return;
    }
    setSaving(true);
    try {
      const { user: updatedUser } = await updateHomeLocation({
        address: location.address,
        city: location.city || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setUser(updatedUser as typeof user);
      Alert.alert('Saved', 'Your home location was updated.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err.response?.data?.message || 'Could not save location');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Profile</Text>
      <GlassCard>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.city}>
          {user?.houseOwner?.city || location?.city || 'Set your home location below'}
        </Text>
      </GlassCard>

      {location ? (
        <LocationMapPreview
          latitude={location.latitude}
          longitude={location.longitude}
          address={location.address}
        />
      ) : null}

      <LocationPicker
        label="Home location"
        placeholder="Search your society, street, or area"
        value={location}
        onChange={setLocation}
      />
      <GradientButton
        title={saving ? 'Saving…' : 'Save home location'}
        onPress={saveLocation}
        loading={saving}
        style={{ marginTop: 4 }}
      />

      <GradientButton title="Sign out" variant="outline" onPress={signOut} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: Stitch.colors.onSurfaceVariant, marginTop: 6 },
  city: { marginTop: 8, color: Stitch.colors.secondary, fontWeight: '600' },
});
