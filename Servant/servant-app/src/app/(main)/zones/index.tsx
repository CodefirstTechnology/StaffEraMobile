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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GhostInput } from '@/components/ui/GhostInput';
import { GradientButton } from '@/components/ui/GradientButton';


type Zone = {
  id: number;
  name: string;
  description?: string | null;
  city?: string | null;
};

export default function ZonesScreen() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');

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
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
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
      Alert.alert('Error', e.response?.data?.message || 'Could not save zone');
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
    Alert.alert('Delete zone', `Remove "${zone.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
      <Text style={styles.title}>Servant Zone</Text>
      <Text style={styles.sub}>
        Add areas where you are available to work. House owners can find you by zone.
      </Text>

      <GradientButton title="Add zone" onPress={openCreate} style={{ marginBottom: 16 }} />

      <FlatList
        data={zones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading ? 'Loading…' : 'No zones yet. Add your first service area.'}
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
            <Text style={styles.sheetTitle}>{editing ? 'Edit zone' : 'New zone'}</Text>
            <GhostInput
              label="Zone name"
              placeholder="e.g. Bandra West"
              value={name}
              onChangeText={setName}
            />
            <GhostInput
              label="City"
              placeholder="Mumbai"
              value={city}
              onChangeText={setCity}
            />
            <GhostInput
              label="Description"
              placeholder="Optional details"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 72 }}
            />
            <GradientButton
              title={saveMutation.isPending ? 'Saving…' : 'Save'}
              onPress={() => saveMutation.mutate()}
              style={{ marginTop: 20 }}
            />
            <GradientButton
              title="Cancel"
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
