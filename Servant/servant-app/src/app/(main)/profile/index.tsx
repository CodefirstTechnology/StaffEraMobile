import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '@/lib/apiConfig';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Stitch, StatusColors } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { translateVerification } from '@/lib/i18n';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { formatCurrency } from '@/lib/i18n/format';
import { formatSkillLabel } from '@/lib/skills';
import { GhostInput } from '@/components/ui/GhostInput';

type Zone = { id: number; name: string; city?: string | null };
type Skill = { skillName: string };

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ['servant-profile'],
    queryFn: async () => {
      const res = await api.get('/servants/me');
      return res.data.data.servant as {
        verificationStatus: string;
        bio?: string | null;
        profilePhoto?: string | null;
        rating?: number;
        totalRatings?: number;
        hourlyRate?: number | null;
        monthlyRate?: number | null;
        experience?: number | null;
        zones?: Zone[];
        skills?: Skill[];
        user?: { name: string; email: string; phone?: string | null };
      };
    },
  });

  useEffect(() => {
    if (profile?.user) {
      setName(profile.user.name || '');
      setEmail(profile.user.email || '');
      setPhone(profile.user.phone || '');
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Valid email is required');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/servants/me', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });
      await refetch();
      await hydrate();
      setEditing(false);
      Alert.alert(t('success.saved') || 'Success', 'Profile updated successfully');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an image that is 3MB or less.');
        return;
      }
      await uploadImage(asset.uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setSaving(true);
    try {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append('profilePhoto', {
        uri,
        name: filename,
        type,
      } as any);

      await api.post('/servants/me/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await refetch();
      await hydrate();
      Alert.alert(t('success.saved') || 'Success', 'Profile photo updated successfully');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err.response?.data?.message || 'Could not upload image');
    } finally {
      setSaving(false);
    }
  };

  const zones: Zone[] = profile?.zones || [];
  const skills = profile?.skills || [];
  const verification = profile?.verificationStatus || user?.servant?.verificationStatus || 'PENDING';
  const verifyStyle = StatusColors[verification] || StatusColors.PENDING;
  const displayName = profile?.user?.name || user?.name || t('verification.verifiedHelper');
  const userEmail = profile?.user?.email || user?.email;
  const userPhone = profile?.user?.phone;
  const initial = displayName.trim()[0]?.toUpperCase() || '?';

  const photoUrl = profile?.profilePhoto || user?.servant?.profilePhoto;
  const backendBase = API_BASE_URL.replace('/api/v1', '');
  const avatarSource = photoUrl ? { uri: photoUrl.startsWith('http') ? photoUrl : `${backendBase}${photoUrl}` } : null;

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('profile.title')}</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditing(true)} hitSlop={8}>
            <MaterialIcons name="edit" size={24} color={Stitch.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {editing ? (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.editTitle}>{t('profile.editDetails') || 'Edit Profile Details'}</Text>
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
            label={t('auth.mobile') || 'Mobile Number'}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('auth.mobile') || 'Mobile Number'}
          />
          <View style={styles.editActions}>
            <GradientButton
              title={saving ? t('common.saving') : t('common.save') || 'Save'}
              onPress={saveProfile}
              loading={saving}
              style={styles.saveBtn}
            />
            <GradientButton
              title={t('common.cancel')}
              variant="outline"
              onPress={() => {
                setEditing(false);
                setName(profile?.user?.name || '');
                setEmail(profile?.user?.email || '');
                setPhone(profile?.user?.phone || '');
              }}
              style={styles.cancelBtn}
            />
          </View>
        </GlassCard>
      ) : (
        <>
          <LinearGradient
            colors={[Stitch.colors.primary, Stitch.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.85}>
              <View style={styles.avatar}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.cameraIconBadge}>
                <MaterialIcons name="photo-camera" size={12} color={Stitch.colors.primary} />
              </View>
              {verification === 'VERIFIED' ? (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={16} color="#1D9BF0" />
                </View>
              ) : null}
            </TouchableOpacity>

            <Text style={styles.heroName} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.heroBrand}>{t('common.appNamePro')}</Text>

            {verification === 'VERIFIED' ? (
              <VerifiedBadge size="md" />
            ) : (
              <View style={[styles.verifyPill, { backgroundColor: verifyStyle.bg }]}>
                <Text style={[styles.verifyText, { color: verifyStyle.text }]}>
                  {translateVerification(verification)}
                </Text>
              </View>
            )}

            {userEmail ? (
              <View style={styles.metaRow}>
                <MaterialIcons name="mail-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {userEmail}
                </Text>
              </View>
            ) : null}
            {userPhone ? (
              <View style={styles.metaRow}>
                <MaterialIcons name="phone" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{userPhone}</Text>
              </View>
            ) : null}
          </LinearGradient>

      {(profile?.rating != null ||
        profile?.hourlyRate != null ||
        profile?.experience != null) && (
        <GlassCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            {profile?.rating != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="star" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{t('servantProfile.rating')}</Text>
              </View>
            ) : null}
            {profile?.hourlyRate != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="schedule" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>
                  {t('common.rupee')}
                  {formatCurrency(profile.hourlyRate)}
                </Text>
                <Text style={styles.statLabel}>{t('servantProfile.perHour')}</Text>
              </View>
            ) : null}
            {profile?.experience != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="work-outline" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>{profile.experience}y</Text>
                <Text style={styles.statLabel}>{t('servantProfile.experience')}</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>
      )}

      {skills.length > 0 ? (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="handyman" size={20} color={Stitch.colors.secondary} />
            </View>
            <Text style={styles.sectionTitle}>{t('servantProfile.yourSkills')}</Text>
          </View>
          <View style={styles.skillChips}>
            {skills.map((s) => (
              <View key={s.skillName} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{formatSkillLabel(s.skillName, [])}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {profile?.bio ? (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="info-outline" size={20} color={Stitch.colors.secondary} />
            </View>
            <Text style={styles.sectionTitle}>{t('servantProfile.aboutYou')}</Text>
          </View>
          <Text style={styles.bio}>{profile.bio}</Text>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.languageCard}>
        <LanguageSelector showTitle />
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="map" size={20} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>{t('zones.title')}</Text>
            <Text style={styles.sectionSub}>{t('zones.manageSub')}</Text>
          </View>
        </View>

        {zones.length === 0 ? (
          <>
            <Text style={styles.zoneEmpty}>{t('zones.empty')}</Text>
            <TouchableOpacity
              style={styles.zoneBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(main)/zones?add=1')}
            >
              <MaterialIcons name="add-location-alt" size={22} color={Stitch.colors.primary} />
              <View style={styles.zoneBtnTextWrap}>
                <Text style={styles.zoneBtnTitle}>{t('zones.addZone')}</Text>
                <Text style={styles.zoneBtnSub}>{t('zones.manageSub')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.zoneChips}>
            {zones.map((z) => (
              <View key={z.id} style={styles.zoneChip}>
                <MaterialIcons name="place" size={14} color={Stitch.colors.primary} />
                <Text style={styles.zoneChipText}>
                  {z.name}
                  {z.city ? ` · ${z.city}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {zones.length > 0 ? (
          <TouchableOpacity
            style={styles.zoneBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/zones')}
          >
            <MaterialIcons name="map" size={22} color={Stitch.colors.primary} />
            <View style={styles.zoneBtnTextWrap}>
              <Text style={styles.zoneBtnTitle}>{t('zones.manage')}</Text>
              <Text style={styles.zoneBtnSub}>{t('zones.manageSub')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="verified-user" size={20} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>Aadhaar verification</Text>
            <Text style={styles.sectionSub}>
              Verify with Offline e-KYC from myAadhaar (free, UIDAI-signed)
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.zoneBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(main)/profile/verify-aadhaar')}
        >
          <MaterialIcons name="upload-file" size={22} color={Stitch.colors.primary} />
          <View style={styles.zoneBtnTextWrap}>
            <Text style={styles.zoneBtnTitle}>Verify Aadhaar</Text>
            <Text style={styles.zoneBtnSub}>Upload ZIP + 4-digit share code</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </GlassCard>

      <GradientButton title={t('auth.signOut')} variant="outline" onPress={signOut} style={styles.signOutBtn} />
        </>
      )}
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
    marginBottom: 16,
    shadowColor: Stitch.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
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
    borderColor: '#1D9BF0',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  heroBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  verifyPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  verifyText: { fontSize: 12, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, flexShrink: 1 },
  languageCard: { marginBottom: 12 },
  statsCard: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: Stitch.colors.primary },
  statLabel: { fontSize: 11, color: Stitch.colors.onSurfaceVariant, fontWeight: '600' },
  sectionCard: { marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionSub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 3, lineHeight: 16 },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    backgroundColor: Stitch.colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
  },
  skillChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.primary },
  bio: { fontSize: 14, lineHeight: 22, color: Stitch.colors.onSurfaceVariant },
  zoneEmpty: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, lineHeight: 20, marginBottom: 4 },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
  },
  zoneChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.primary },
  zoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Stitch.colors.outlineVariant,
    gap: 12,
  },
  zoneBtnTextWrap: { flex: 1 },
  zoneBtnTitle: { fontSize: 15, fontWeight: '700', color: Stitch.colors.onBackground },
  zoneBtnSub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  signOutBtn: { marginTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Stitch.spacing.gutter,
  },
  editIconBtn: {
    padding: 4,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
  },
  cancelBtn: {
    flex: 1,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
});
