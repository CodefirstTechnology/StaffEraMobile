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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import { updateHomeLocation } from '@/lib/geo';
import { mapsDeepLink, type LocationValue } from '@/lib/locationTypes';
import { hasSavedHomeAddress, type HouseOwnerProfile } from '@/lib/homeLocation';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import api from '@/lib/api';
import { te, normalizeApiErrorMessage } from '@/lib/i18n/alertMessages';

function profileFromHouseOwner(ho?: HouseOwnerProfile | null) {
  const location: LocationValue | null =
    ho?.latitude != null && ho?.longitude != null && ho.address
      ? {
          address: ho.address,
          city: ho.city,
          latitude: ho.latitude,
          longitude: ho.longitude,
          flatNo: ho.flatNo,
          building: ho.building,
          area: ho.area,
        }
      : null;
  const addressUnit: AddressUnitValue = {
    flatNo: ho?.flatNo || '',
    building: ho?.building || '',
    area: ho?.area || '',
  };
  return { location, addressUnit };
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuthStore();
  const ho = user?.houseOwner;
  const hasSaved = hasSavedHomeAddress(ho);
  const [editingAccount, setEditingAccount] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [editing, setEditing] = useState(!hasSaved);
  const [location, setLocation] = useState<LocationValue | null>(
    () => profileFromHouseOwner(ho).location,
  );
  const [addressUnit, setAddressUnit] = useState<AddressUnitValue>(
    () => profileFromHouseOwner(ho).addressUnit,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user?.name, user?.email, user?.phone]);

  useEffect(() => {
    const next = profileFromHouseOwner(user?.houseOwner);
    setAddressUnit(next.addressUnit);
    if (!editing) {
      setLocation(next.location);
      if (hasSavedHomeAddress(user?.houseOwner)) {
        setEditing(false);
      }
    } else if (!location && next.location) {
      setLocation(next.location);
    }
  }, [user?.houseOwner]);

  const startEditing = () => {
    const next = profileFromHouseOwner(user?.houseOwner);
    setLocation(next.location);
    setAddressUnit(next.addressUnit);
    setEditing(true);
  };

  const cancelEditing = () => {
    const next = profileFromHouseOwner(user?.houseOwner);
    setLocation(next.location);
    setAddressUnit(next.addressUnit);
    setEditing(false);
  };

  const startEditingAccount = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setEditingAccount(true);
  };

  const cancelEditingAccount = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setEditingAccount(false);
  };

  const saveAccount = async () => {
    if (!name.trim()) {
      Alert.alert(te('errors.generic'), te('validation.nameMin'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(te('errors.generic'), te('validation.emailInvalid'));
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone.trim() && phoneDigits.length < 10) {
      Alert.alert(te('errors.generic'), te('validation.phoneInvalid'));
      return;
    }
    setSavingAccount(true);
    try {
      const payload: { name: string; email: string; phone?: string } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      };
      if (phoneDigits) {
        payload.phone = phoneDigits;
      } else if (user?.phone) {
        payload.phone = '';
      }
      const res = await api.patch('/auth/me/profile', payload);
      setUser(res.data.data.user as typeof user);
      setEditingAccount(false);
      Alert.alert(t('success.saved'), t('profile.profileUpdated'));
    } catch (e: unknown) {
      const err = e as {
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      const apiMessage = err.response?.data?.message;
      const message = apiMessage
        ? normalizeApiErrorMessage(apiMessage)
        : err.response?.status === 404
          ? te('errors.profileEndpointMissing')
          : te('errors.couldNotSaveProfile');
      Alert.alert(te('errors.generic'), message);
    } finally {
      setSavingAccount(false);
    }
  };

  const saveLocation = async () => {
    if (!location) {
      Alert.alert(te('validation.locationRequired'), te('validation.pickHomeFirst'));
      return;
    }
    setSaving(true);
    try {
      const { user: updatedUser } = await updateHomeLocation({
        address: location.address,
        flatNo: addressUnit.flatNo.trim(),
        building: addressUnit.building.trim(),
        area: addressUnit.area.trim(),
        city: location.city || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setUser(updatedUser as typeof user);
      setEditing(false);
      Alert.alert(t('success.saved'), t('success.homeLocationUpdated'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(te('errors.generic'), err.response?.data?.message || te('errors.couldNotSave'));
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const openMaps = () => {
    if (!location) return;
    Linking.openURL(
      mapsDeepLink(location.latitude, location.longitude, location.address || undefined),
    );
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';
  const displayCity = user?.houseOwner?.city || location?.city;
  const savedLines = formatVisitAddressLines({
    flatNo: user?.houseOwner?.flatNo,
    building: user?.houseOwner?.building,
    area: user?.houseOwner?.area,
    address: user?.houseOwner?.address,
  });
  const savedLocation =
    user?.houseOwner?.latitude != null && user?.houseOwner?.longitude != null
      ? {
          latitude: user.houseOwner.latitude,
          longitude: user.houseOwner.longitude,
          address: user.houseOwner.address,
        }
      : null;

  const openSavedMaps = () => {
    if (!savedLocation) return;
    Linking.openURL(
      mapsDeepLink(
        savedLocation.latitude,
        savedLocation.longitude,
        savedLocation.address || undefined,
      ),
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('profile.title')}</Text>
        {!editingAccount ? (
          <TouchableOpacity style={styles.editIconBtn} onPress={startEditingAccount} hitSlop={8}>
            <MaterialIcons name="edit" size={24} color={Stitch.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {editingAccount ? (
        <GlassCard style={styles.accountCard}>
          <Text style={styles.editTitle}>{t('profile.editDetails')}</Text>
          <GhostInput
            label={t('auth.fullName')}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.fullName')}
          />
          <GhostInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('auth.email')}
          />
          <GhostInput
            label={t('auth.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('auth.phone')}
          />
          <View style={styles.profileEditActions}>
            <GradientButton
              title={savingAccount ? t('common.saving') : t('common.save')}
              onPress={saveAccount}
              loading={savingAccount}
              style={styles.profileSaveBtn}
            />
            <GradientButton
              title={t('common.cancel')}
              variant="outline"
              onPress={cancelEditingAccount}
              style={styles.profileCancelBtn}
            />
          </View>
        </GlassCard>
      ) : (
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
            {user?.name || t('profile.houseOwner')}
          </Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{t('profile.houseOwner')}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons name="mail-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons name="phone" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {user?.phone || '—'}
            </Text>
          </View>
          {displayCity ? (
            <View style={styles.cityPill}>
              <MaterialIcons name="location-on" size={14} color="#fff" />
              <Text style={styles.cityPillText}>{displayCity}</Text>
            </View>
          ) : null}
        </LinearGradient>
      )}

      <GlassCard style={styles.languageCard}>
        <LanguageSelector showTitle />
      </GlassCard>

      <GlassCard style={styles.locationCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="home" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>{t('profile.homeLocation')}</Text>
            <Text style={styles.sectionSub}>
              {editing ? t('profile.homeLocationSub') : t('profile.homeLocationSavedSub')}
            </Text>
          </View>
          {hasSaved && !editing ? (
            <TouchableOpacity style={styles.editChip} onPress={startEditing} hitSlop={8}>
              <MaterialIcons name="edit" size={16} color={Stitch.colors.secondary} />
              <Text style={styles.editChipText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {editing ? (
          <>
            <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
            <LocationPicker
              placeholder={t('auth.searchPlaceholder')}
              value={location}
              onChange={setLocation}
              height={200}
            />
            {location ? (
              <TouchableOpacity style={styles.mapsLink} onPress={openMaps} activeOpacity={0.85}>
                <MaterialIcons name="map" size={18} color={Stitch.colors.primary} />
                <Text style={styles.mapsLinkText}>{t('common.openMaps')}</Text>
                <MaterialIcons name="open-in-new" size={16} color={Stitch.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </>
        ) : hasSaved ? (
          <View style={styles.savedCard}>
            <View style={styles.savedBadge}>
              <MaterialIcons name="check-circle" size={16} color={Stitch.colors.success} />
              <Text style={styles.savedBadgeText}>{t('profile.homeAddressSaved')}</Text>
            </View>
            <Text style={styles.savedAddress}>
              {savedLines.length > 0
                ? savedLines.join('\n')
                : user?.houseOwner?.address || '—'}
            </Text>
            {displayCity ? (
              <View style={styles.savedCityRow}>
                <MaterialIcons name="location-on" size={16} color={Stitch.colors.secondary} />
                <Text style={styles.savedCity}>{displayCity}</Text>
              </View>
            ) : null}
            {savedLocation ? (
              <TouchableOpacity
                style={styles.mapsLink}
                onPress={openSavedMaps}
                activeOpacity={0.85}
              >
                <MaterialIcons name="map" size={18} color={Stitch.colors.primary} />
                <Text style={styles.mapsLinkText}>{t('common.openMaps')}</Text>
                <MaterialIcons name="open-in-new" size={16} color={Stitch.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={styles.emptyHome}>{t('profile.noHomeYet')}</Text>
            <GradientButton
              title={t('profile.addHomeLocation')}
              onPress={startEditing}
              style={styles.addHomeBtn}
            />
          </>
        )}
      </GlassCard>

      {editing ? (
        <View style={styles.editActions}>
          <GradientButton
            title={saving ? t('common.saving') : t('profile.saveHomeLocation')}
            onPress={saveLocation}
            loading={saving}
            style={styles.saveBtn}
          />
          {hasSaved ? (
            <GradientButton
              title={t('common.cancel')}
              variant="outline"
              onPress={cancelEditing}
              style={styles.cancelBtn}
            />
          ) : null}
        </View>
      ) : null}

      <GradientButton
        title={t('auth.signOut')}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 0,
    flex: 1,
  },
  editIconBtn: { padding: 4 },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 16,
  },
  profileEditActions: { gap: 12, marginTop: 4 },
  profileSaveBtn: { marginBottom: 0 },
  profileCancelBtn: { marginTop: 0 },
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
  accountCard: { marginBottom: 20 },
  languageCard: { marginBottom: 16 },
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
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.secondaryFixed,
  },
  editChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
  savedCard: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant + '44',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Stitch.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Stitch.radius.pill,
    marginBottom: 12,
  },
  savedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Stitch.colors.success,
  },
  savedAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: Stitch.colors.onBackground,
    lineHeight: 22,
  },
  savedCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  savedCity: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  emptyHome: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 14,
  },
  addHomeBtn: { marginTop: 0 },
  editActions: { marginBottom: 12 },
  cancelBtn: { marginTop: 0 },
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
