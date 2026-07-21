import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

type PickedZip = DocumentPicker.DocumentPickerAsset;

export default function VerifyAadhaarScreen() {
  const qc = useQueryClient();
  const [method, setMethod] = useState<'xml' | 'manual'>('xml');
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

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: method === 'xml' ? 'application/zip' : ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'File must be 5 MB or less.');
          return;
        }
        setZip(asset);
      }
    } catch (err) {
      // ignore
    }
  };

  const verify = async () => {
    if (!zip?.uri) {
      Alert.alert(
        'Missing file',
        method === 'xml' ? 'Choose the Aadhaar Offline e-KYC ZIP file.' : 'Choose your Aadhaar image or PDF document.'
      );
      return;
    }
    if (method === 'xml' && !/^\d{4}$/.test(shareCode.trim())) {
      Alert.alert('Share code', 'Enter the 4-digit share code from myAadhaar.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      if (method === 'xml') {
        fd.append('aadhaarZip', {
          uri: zip.uri,
          name: zip.name || 'aadhaar.zip',
          type: 'application/zip',
        } as unknown as Blob);
        fd.append('shareCode', shareCode.trim());

        await api.post('/kyc/aadhaar/xml/verify', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        let fileType = zip.mimeType;
        if (!fileType) {
          const ext = zip.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') fileType = 'application/pdf';
          else if (ext === 'png') fileType = 'image/png';
          else fileType = 'image/jpeg';
        }

        fd.append('idProof', {
          uri: zip.uri,
          name: zip.name || 'aadhaar.jpg',
          type: fileType,
        } as unknown as Blob);

        await api.post('/kyc/aadhaar/manual/verify', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await qc.invalidateQueries({ queryKey: ['aadhaar-status'] });
      await qc.invalidateQueries({ queryKey: ['servant-profile'] });
      Alert.alert('Verified', 'Your Aadhaar has been submitted and verified successfully.');
      router.back();
    } catch (e: unknown) {
      Alert.alert('Verification failed', getApiErrorMessage(e, 'Try again with the correct file and details.'));
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
      <View style={styles.root}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Verify Aadhaar</Text>
          <Text style={styles.sub}>Your profile verification details</Text>
          
          <GlassCard style={styles.card}>
            <View style={styles.verifiedHeader}>
              <MaterialIcons name="verified" size={24} color="#047857" />
              <Text style={styles.verifiedTitle}>Aadhaar Verified</Text>
            </View>
            
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoVal}>{status.aadhaar.name || '—'}</Text>
              </View>
              {status.aadhaar.dob ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoVal}>{status.aadhaar.dob}</Text>
                </View>
              ) : null}
              {status.aadhaar.gender ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoVal}>{status.aadhaar.gender}</Text>
                </View>
              ) : null}
              {status.aadhaar.address ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoVal}>{status.aadhaar.address}</Text>
                </View>
              ) : null}
            </View>
          </GlassCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Verify Aadhaar</Text>
        <Text style={styles.sub}>
          Choose your verification method to link and verify your Aadhaar details.
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, method === 'xml' && styles.activeTab]}
            onPress={() => {
              setMethod('xml');
              setZip(null);
              setShareCode('');
            }}
          >
            <Text style={[styles.tabText, method === 'xml' && styles.activeTabText]}>Offline XML</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, method === 'manual' && styles.activeTab]}
            onPress={() => {
              setMethod('manual');
              setZip(null);
              setShareCode('');
            }}
          >
            <Text style={[styles.tabText, method === 'manual' && styles.activeTabText]}>Upload Document</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.card}>
          {method === 'xml' ? (
            <>
              <TouchableOpacity onPress={() => Linking.openURL('https://myaadhaar.uidai.gov.in/offline-ekyc')} style={styles.linkContainer}>
                <Text style={styles.link}>Open myAadhaar Offline e-KYC →</Text>
              </TouchableOpacity>

              <View style={styles.pickContainer}>
                <Text style={styles.pickLabel}>Select Offline e-KYC File</Text>
                <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
                  <MaterialIcons name="folder-open" size={22} color={Stitch.colors.primary} />
                  <Text style={styles.pickText} numberOfLines={1}>
                    {zip?.name || 'Choose Aadhaar ZIP file'}
                  </Text>
                </TouchableOpacity>
              </View>

              <GhostInput
                label="Share code (4 digits)"
                keyboardType="number-pad"
                maxLength={4}
                value={shareCode}
                onChangeText={(v) => setShareCode(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
              />
            </>
          ) : (
            <>
              <View style={styles.pickContainer}>
                <Text style={styles.pickLabel}>Select Aadhaar Card (Image/PDF)</Text>
                <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
                  <MaterialIcons name="folder-open" size={22} color={Stitch.colors.primary} />
                  <Text style={styles.pickText} numberOfLines={1}>
                    {zip?.name || 'Choose Aadhaar Image/PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <GradientButton title="Verify Aadhaar" onPress={verify} loading={loading} disabled={loading} style={styles.submitBtn} />
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    paddingTop: 52,
    paddingHorizontal: Stitch.spacing.padding,
  },
  scroll: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.colors.background,
  },
  back: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 20,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Stitch.radius.md,
  },
  activeTab: {
    backgroundColor: Stitch.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
  },
  activeTabText: {
    color: '#fff',
  },
  card: {
    padding: 20,
    gap: 18,
  },
  linkContainer: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  link: {
    color: Stitch.colors.secondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  pickContainer: {
    gap: 8,
    marginBottom: 8,
  },
  pickLabel: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    marginLeft: 4,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  pickText: {
    flex: 1,
    fontSize: 15,
    color: Stitch.colors.onBackground,
  },
  submitBtn: {
    marginTop: 8,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verifiedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  infoList: {
    gap: 14,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoVal: {
    fontSize: 15,
    color: Stitch.colors.onBackground,
    fontWeight: '500',
  },
});
