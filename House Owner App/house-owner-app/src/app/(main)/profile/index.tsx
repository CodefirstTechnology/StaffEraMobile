import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { updateHomeLocation } from '@/lib/geo';
import { mapsDeepLink, type LocationValue } from '@/lib/locationTypes';

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

  const openMaps = () => {
    if (!location) return;
    Linking.openURL(
      mapsDeepLink(location.latitude, location.longitude, location.address || undefined),
    );
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';
  const displayCity = user?.houseOwner?.city || location?.city;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>Profile</Text>

      <LinearGradient
        colors={[Stitch.colors.primary, Stitch.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color={Stitch.colors.success} />
          </View>
        </View>
        <Text style={styles.heroName} numberOfLines={2}>
          {user?.name || 'House owner'}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>House owner</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="mail-outline" size={16} color="rgba(255,255,255,0.85)" />
          <Text style={styles.metaText} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
        {displayCity ? (
          <View style={styles.cityPill}>
            <MaterialIcons name="location-on" size={14} color="#fff" />
            <Text style={styles.cityPillText}>{displayCity}</Text>
          </View>
        ) : null}
      </LinearGradient>

      <GlassCard style={styles.locationCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="home" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>Home location</Text>
            <Text style={styles.sectionSub}>
              Search, tap the map, or use GPS — helpers see jobs near this address
            </Text>
          </View>
        </View>

        <LocationPicker
          placeholder="Search your society, street, or area"
          value={location}
          onChange={setLocation}
          height={200}
        />

        {location ? (
          <TouchableOpacity style={styles.mapsLink} onPress={openMaps} activeOpacity={0.85}>
            <MaterialIcons name="map" size={18} color={Stitch.colors.primary} />
            <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
            <MaterialIcons name="open-in-new" size={16} color={Stitch.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </GlassCard>

      <GradientButton
        title={saving ? 'Saving…' : 'Save home location'}
        onPress={saveLocation}
        loading={saving}
        style={styles.saveBtn}
      />

      <GradientButton
        title="Sign out"
        variant="outline"
        onPress={signOut}
        style={styles.signOutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingHorizontal: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 48 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 16,
  },
  hero: {
    borderRadius: Stitch.radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Stitch.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
    marginBottom: 14,
  },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, flexShrink: 1 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  cityPillText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  locationCard: { marginBottom: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionSub: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.surfaceLow,
    alignSelf: 'flex-start',
  },
  mapsLinkText: { color: Stitch.colors.primary, fontWeight: '600', fontSize: 14 },
  saveBtn: { marginBottom: 12 },
  signOutBtn: { marginTop: 4 },
});
