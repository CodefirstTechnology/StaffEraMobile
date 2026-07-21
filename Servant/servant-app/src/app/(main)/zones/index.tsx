import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { GradientButton } from '@/components/ui/GradientButton';
import { useMyZones, type ServantZone } from '@/hooks/useMyZones';
import type { LocationValue } from '@/lib/locationTypes';

export default function ZonesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { add, from } = useLocalSearchParams<{ add?: string; from?: string }>();
  const { data: zones = [], isLoading, refetch } = useMyZones();

  const [formOpen, setFormOpen] = useState(add === '1');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setName('');
    setCity('');
    setDescription('');
    setLocation(null);
    setFormError('');
    setEditingZoneId(null);
    setFormOpen(false);
  };

  const buildPayload = () => ({
    name: name.trim() || location?.address?.split(',')[0]?.trim() || '',
    description: description.trim() || undefined,
    city: location?.city || city.trim(),
    latitude: location?.latitude,
    longitude: location?.longitude,
  });

  const saveZone = async () => {
    const payload = buildPayload();
    if (!payload.name) {
      setFormError(t('zones.zoneRequiredSub'));
      return;
    }
    if (!payload.city) {
      setFormError(t('zones.cityRequired'));
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingZoneId) {
        await api.patch(`/zones/me/${editingZoneId}`, payload);
      } else {
        await api.post('/zones/me', payload);
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-zones'] }),
        qc.invalidateQueries({ queryKey: ['servant-profile'] }),
      ]);
      resetForm();
      Alert.alert(t('success.saved') || 'Saved', t('zones.zoneAdded'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(err.response?.data?.message || t('zones.couldNotSaveZone'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: ServantZone) => {
    setEditingZoneId(item.id);
    setName(item.name);
    setCity(item.city || '');
    setDescription(item.description || '');
    if (item.latitude && item.longitude) {
      setLocation({
        latitude: item.latitude,
        longitude: item.longitude,
        city: item.city || '',
        address: item.name || '',
      });
    } else {
      setLocation(null);
    }
    setFormOpen(true);
  };

  const handleDelete = (item: ServantZone) => {
    Alert.alert(
      t('zones.deleteZoneTitle') || 'Delete zone',
      t('zones.removeZone', { name: item.name }) || `Remove "${item.name}"?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/zones/me/${item.id}`);
              await Promise.all([
                qc.invalidateQueries({ queryKey: ['my-zones'] }),
                qc.invalidateQueries({ queryKey: ['servant-profile'] }),
              ]);
            } catch (e: unknown) {
              const err = e as { response?: { data?: { message?: string } } };
              Alert.alert(t('common.error') || 'Error', err.response?.data?.message || t('zones.couldNotDeleteZone') || 'Could not delete zone.');
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (formOpen) {
      if (add === '1') {
        if (from === 'profile') {
          router.replace('/(main)/profile');
        } else if (from === 'home') {
          router.replace('/(main)/home');
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(main)/profile');
        }
      } else {
        resetForm();
      }
    } else {
      if (from === 'profile') {
        router.replace('/(main)/profile');
      } else if (from === 'home') {
        router.replace('/(main)/home');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(main)/profile');
      }
    }
  };

  const renderZone = ({ item }: { item: ServantZone }) => (
    <GlassCard style={styles.card}>
      <View style={styles.cardRow}>
        <MaterialIcons name="place" size={22} color={Stitch.colors.secondary} style={styles.cardIcon} />
        <View style={styles.cardBody}>
          <Text style={styles.zoneName}>{item.name}</Text>
          {item.city ? <Text style={styles.zoneMeta}>{item.city}</Text> : null}
          {item.description ? <Text style={styles.zoneDesc}>{item.description}</Text> : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionBtn}>
            <MaterialIcons name="edit" size={20} color={Stitch.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <MaterialIcons name="delete" size={20} color={Stitch.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity onPress={handleBack} style={styles.back}>
          <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('zones.screenTitle')}</Text>
        <Text style={styles.sub}>{t('zones.screenSub')}</Text>

        {!formOpen ? (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={() => setFormOpen(true)} activeOpacity={0.85}>
              <MaterialIcons name="add-location-alt" size={20} color={Stitch.colors.primary} />
              <Text style={styles.addBtnText}>{t('zones.addZone')}</Text>
            </TouchableOpacity>

            <FlatList
              data={zones}
              keyExtractor={(item) => String(item.id)}
              style={styles.flex}
              contentContainerStyle={styles.list}
              refreshing={isLoading}
              onRefresh={refetch}
              ListEmptyComponent={
                !isLoading ? (
                  <Text style={styles.empty}>{t('zones.noZonesList')}</Text>
                ) : null
              }
              renderItem={renderZone}
            />
          </>
        ) : (
          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingZoneId ? t('zones.editZone') : t('zones.newZone')}
              </Text>
              <GhostInput
                label={t('zones.zoneName')}
                value={name}
                onChangeText={setName}
                placeholder={t('zones.zoneNamePlaceholder')}
              />
              <GhostInput
                label={t('zones.cityLabel')}
                value={city}
                onChangeText={setCity}
                placeholder={t('zones.cityPlaceholder')}
              />
              <GhostInput
                label={t('zones.description')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('zones.descriptionPlaceholder')}
              />
              <Text style={styles.mapLabel}>{t('zones.zoneOnMap')}</Text>
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  setLocation(loc);
                  if (loc.city && !city.trim()) setCity(loc.city);
                  if (!name.trim() && loc.address) {
                    setName(loc.address.split(',')[0]?.trim() || '');
                  }
                }}
                label={t('zones.zoneOnMap')}
                height={180}
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <View style={styles.formActions}>
                <GradientButton
                  title={saving ? t('common.saving') : (editingZoneId ? t('common.save') : t('zones.addZone'))}
                  onPress={saveZone}
                  loading={saving}
                  style={styles.saveBtn}
                />
                <GradientButton
                  title={t('common.cancel')}
                  variant="outline"
                  onPress={resetForm}
                  style={styles.cancelBtn}
                />
              </View>
            </GlassCard>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    paddingHorizontal: Stitch.spacing.padding,
    paddingTop: 52,
  },
  flex: { flex: 1 },
  back: { marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 16, lineHeight: 20 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.primaryFixed,
  },
  addBtnText: { fontWeight: '700', color: Stitch.colors.primary },
  formCard: { marginBottom: 16 },
  formTitle: { fontSize: 17, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 12 },
  mapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 8,
    marginTop: 4,
  },
  formError: { color: Stitch.colors.error, fontSize: 13, marginTop: 8, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBtn: { flex: 1 },
  cancelBtn: { flex: 1 },
  list: { paddingBottom: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: { marginTop: 2 },
  cardBody: { flex: 1, marginLeft: 10 },
  zoneName: { fontSize: 17, fontWeight: '600' },
  zoneMeta: { fontSize: 13, color: Stitch.colors.secondary, marginTop: 2 },
  zoneDesc: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'center',
    marginLeft: 8,
  },
  actionBtn: {
    padding: 6,
  },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant, marginTop: 32 },
});
