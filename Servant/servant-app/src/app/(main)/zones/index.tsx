import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GhostInput } from '@/components/ui/GhostInput';
import { GradientButton } from '@/components/ui/GradientButton';


import { LocationPicker } from '@/components/ui/LocationPicker';
import type { LocationValue } from '@/lib/locationTypes';

type Zone = {
  id: number;
  name: string;
  description?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function ZonesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [zoneLocation, setZoneLocation] = useState<LocationValue | null>(null);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['my-zones'],
    queryFn: async () => {
      const res = await api.get('/zones/me');
      return res.data.data.zones as Zone[];
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setCity('');
    setZoneLocation(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (zone: Zone) => {
    setEditing(zone);
    setName(zone.name);
    setDescription(zone.description || '');
    setCity(zone.city || '');
    if (zone.latitude != null && zone.longitude != null) {
      setZoneLocation({
        address: zone.name,
        city: zone.city,
        latitude: zone.latitude,
        longitude: zone.longitude,
      });
    } else {
      setZoneLocation(null);
    }
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || zoneLocation?.address?.split(',')[0] || '',
        description: description.trim() || undefined,
        city: zoneLocation?.city || city.trim() || undefined,
        latitude: zoneLocation?.latitude,
        longitude: zoneLocation?.longitude,
      };
      if (editing) {
        await api.patch(`/zones/${editing.id}`, payload);
      } else {
        await api.post('/zones', payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-zones'] });
      qc.invalidateQueries({ queryKey: ['servant-profile'] });
      setModalOpen(false);
      resetForm();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(t('errors.generic'), e.response?.data?.message || t('zones.couldNotSaveZone'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/zones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-zones'] });
      qc.invalidateQueries({ queryKey: ['servant-profile'] });
    },
  });

  const confirmDelete = (zone: Zone) => {
    Alert.alert(t('zones.deleteZoneTitle'), t('zones.removeZone', { name: zone.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(zone.id),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
      </TouchableOpacity>
      <Text style={styles.title}>{t('zones.screenTitle')}</Text>
      <Text style={styles.sub}>{t('zones.screenSub')}</Text>

      <GradientButton title={t('zones.addZone')} onPress={openCreate} style={{ marginBottom: 16 }} />

      <FlatList
        data={zones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading ? t('common.loading') : t('zones.noZonesList')}
          </Text>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.cardRow}>
              <MaterialIcons name="place" size={22} color={Stitch.colors.secondary} />
              <View style={styles.cardBody}>
                <Text style={styles.zoneName}>{item.name}</Text>
                {item.city ? <Text style={styles.zoneMeta}>{item.city}</Text> : null}
                {item.description ? (
                  <Text style={styles.zoneDesc}>{item.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <MaterialIcons name="edit" size={22} color={Stitch.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                <MaterialIcons name="delete-outline" size={22} color={Stitch.colors.error} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{editing ? t('zones.editZone') : t('zones.newZone')}</Text>
            <GhostInput
              label={t('zones.zoneName')}
              placeholder={t('zones.zoneNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />
            <LocationPicker
              label={t('zones.zoneOnMap')}
              placeholder={t('location.placeholder')}
              value={zoneLocation}
              onChange={(location) => {
                setZoneLocation(location);
                if (!name.trim()) {
                  setName(location.address.split(',')[0]?.trim() || location.address);
                }
                if (location.city) setCity(location.city);
              }}
              height={180}
            />
            <GhostInput
              label={t('zones.cityLabel')}
              placeholder={t('zones.cityPlaceholder')}
              value={city}
              onChangeText={setCity}
            />
            <GhostInput
              label={t('zones.description')}
              placeholder={t('zones.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 72 }}
            />
            <GradientButton
              title={saveMutation.isPending ? t('common.saving') : t('common.save')}
              onPress={() => {
                if (!name.trim() && !zoneLocation) {
                  Alert.alert(t('zones.zoneRequired'), t('zones.zoneRequiredSub'));
                  return;
                }
                saveMutation.mutate();
              }}
              style={{ marginTop: 20 }}
            />
            <GradientButton
              title={t('common.cancel')}
              variant="outline"
              onPress={() => {
                setModalOpen(false);
                resetForm();
              }}
              style={{ marginTop: 10 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    padding: Stitch.spacing.padding,
    paddingTop: 52,
  },
  back: { marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 16, lineHeight: 20 },
  list: { paddingBottom: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardBody: { flex: 1, marginLeft: 10 },
  zoneName: { fontSize: 17, fontWeight: '600' },
  zoneMeta: { fontSize: 13, color: Stitch.colors.secondary, marginTop: 2 },
  zoneDesc: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  iconBtn: { padding: 6 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant, marginTop: 32 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Stitch.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Stitch.spacing.padding,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: Stitch.colors.primary },
});
