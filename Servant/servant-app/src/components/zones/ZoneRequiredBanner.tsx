import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';

type Props = {
  onAddZone: () => void;
};

export function ZoneRequiredBanner({ onAddZone }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="location-off" size={22} color={Stitch.colors.tertiaryContainer} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{t('zones.dashboardAlertTitle')}</Text>
        <Text style={styles.sub}>{t('zones.dashboardAlertSub')}</Text>
        <TouchableOpacity style={styles.btn} onPress={onAddZone} activeOpacity={0.85}>
          <MaterialIcons name="add-location-alt" size={18} color="#fff" />
          <Text style={styles.btnText}>{t('zones.addZone')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 16,
    padding: 16,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.tertiaryFixed,
    borderWidth: 1,
    borderColor: 'rgba(241, 145, 96, 0.35)',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 219, 203, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: Stitch.colors.tertiary },
  sub: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    backgroundColor: Stitch.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.md,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
