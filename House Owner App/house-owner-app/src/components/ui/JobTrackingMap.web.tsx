import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink, mapsDirectionsUrl } from '@/lib/locationTypes';

type Coord = { latitude: number; longitude: number };

type Props = {
  home?: Coord | null;
  servant?: Coord | null;
  lastUpdated?: string | null;
};

export function JobTrackingMap({ home, servant, lastUpdated }: Props) {
  if (!home) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Live tracking</Text>
      <Text style={styles.hint}>
        {servant
          ? `Helper location · ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-IN') : 'updating'}`
          : 'Waiting for helper to share location…'}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, !servant && styles.btnDisabled]}
          disabled={!servant}
          onPress={() => servant && Linking.openURL(mapsDirectionsUrl(servant, home))}
        >
          <MaterialIcons name="directions" size={18} color="#fff" />
          <Text style={styles.btnText}>Route to helper</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() => Linking.openURL(mapsDeepLink(home.latitude, home.longitude, 'Your home'))}
        >
          <MaterialIcons name="home" size={18} color={Stitch.colors.primary} />
          <Text style={[styles.btnText, styles.btnTextOutline]}>Your home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  hint: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Stitch.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnTextOutline: { color: Stitch.colors.primary },
});
