import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';

type Props = {
  onRetry: () => void;
  checking?: boolean;
};

export function LocationRequiredScreen({ onRetry, checking }: Props) {
  const { t } = useTranslation();

  const handleEnableLocation = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === 'denied' && !current.canAskAgain) {
        void Linking.openSettings();
        return;
      }
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.status !== 'granted') {
        void Linking.openSettings();
        return;
      }
    }
    onRetry();
  };

  const openSettings = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Linking.openSettings();
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="location-off" size={40} color={Stitch.colors.primary} />
      </View>
      <Text style={styles.title}>{t('locationGate.title')}</Text>
      <Text style={styles.sub}>{t('locationGate.sub')}</Text>
      <GradientButton
        title={checking ? t('common.loading') : t('locationGate.enable')}
        onPress={handleEnableLocation}
        loading={checking}
        style={styles.btn}
      />
      <GradientButton
        title={t('locationGate.openSettings')}
        variant="outline"
        onPress={openSettings}
        disabled={checking}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Stitch.spacing.padding,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Stitch.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  btn: { alignSelf: 'stretch', marginBottom: 10 },
});
