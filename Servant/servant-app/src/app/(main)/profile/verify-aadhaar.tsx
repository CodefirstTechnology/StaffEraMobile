import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

type PickedZip = DocumentPicker.DocumentPickerAsset;

export default function VerifyAadhaarScreen() {
  const qc = useQueryClient();
  const [zip, setZip] = useState<PickedZip | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['aadhaar-status'],
    queryFn: async () => {
      const res = await api.get('/kyc/aadhaar/status');
      return res.data.data as {
        aadhaar: {
          verified: boolean;
          name?: string;
          dob?: string;
          gender?: string;
          address?: string;
        };
        phoneVerified?: boolean;
      };
    },
  });

  const pickZip = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/zip',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setZip(result.assets[0]);
    }
  };

  const verify = async () => {
    if (!zip?.uri) {
      Alert.alert('Missing file', 'Choose the Aadhaar Offline e-KYC ZIP file.');
      return;
    }
    if (!/^\d{4}$/.test(shareCode.trim())) {
      Alert.alert('Share code', 'Enter the 4-digit share code from myAadhaar.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('aadhaarZip', {
        uri: zip.uri,
        name: zip.name || 'aadhaar.zip',
        type: 'application/zip',
      } as unknown as Blob);
      fd.append('shareCode', shareCode.trim());

      await api.post('/kyc/aadhaar/xml/verify', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await qc.invalidateQueries({ queryKey: ['aadhaar-status'] });
      await qc.invalidateQueries({ queryKey: ['servant-profile'] });
      Alert.alert('Verified', 'Your Aadhaar has been verified successfully.');
      router.back();
    } catch (e: unknown) {
      Alert.alert('Verification failed', getApiErrorMessage(e, 'Try again with the correct ZIP and share code.'));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Stitch.colors.primary} />
      </View>
    );
  }

  if (status?.aadhaar?.verified) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Stitch.colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <GlassCard style={styles.card}>
          <Text style={styles.verifiedTitle}>✓ Aadhaar verified</Text>
          <Text style={styles.row}>Name: {status.aadhaar.name || '—'}</Text>
          <Text style={styles.row}>DOB: {status.aadhaar.dob || '—'}</Text>
          <Text style={styles.row}>Gender: {status.aadhaar.gender || '—'}</Text>
          <Text style={styles.row}>Address: {status.aadhaar.address || '—'}</Text>
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color={Stitch.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify Aadhaar</Text>
      <Text style={styles.sub}>
        Download Offline e-KYC from myAadhaar, then upload the ZIP and share code here.
      </Text>

      <GlassCard style={styles.card}>
        <TouchableOpacity onPress={() => Linking.openURL('https://myaadhaar.uidai.gov.in/offline-ekyc')}>
          <Text style={styles.link}>Open myAadhaar Offline e-KYC →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickBtn} onPress={pickZip}>
          <MaterialIcons name="folder-open" size={22} color={Stitch.colors.primary} />
          <Text style={styles.pickText}>{zip?.name || 'Choose Aadhaar ZIP file'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Share code (4 digits)</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={4}
          value={shareCode}
          onChangeText={(v) => setShareCode(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          placeholderTextColor={Stitch.colors.onSurfaceVariant}
        />

        <GradientButton title="Verify Aadhaar" onPress={verify} loading={loading} disabled={loading} />
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: Stitch.colors.primary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 16, lineHeight: 20 },
  card: { gap: 14 },
  link: { color: Stitch.colors.secondary, fontWeight: '600', textDecorationLine: 'underline' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  pickText: { flex: 1, color: Stitch.colors.onBackground },
  label: { fontWeight: '600', color: Stitch.colors.onBackground },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Stitch.colors.onBackground,
  },
  verifiedTitle: { fontSize: 18, fontWeight: '700', color: '#047857' },
  row: { color: Stitch.colors.onBackground, lineHeight: 22 },
});
