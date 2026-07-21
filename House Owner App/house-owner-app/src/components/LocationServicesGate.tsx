import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { useLocationServicesGate } from '@/hooks/useLocationServicesGate';
import { openLocationSettings } from '@/lib/locationServices';

type Props = {
  children: React.ReactNode;
};

export function LocationServicesGate({ children }: Props) {
  const { t } = useTranslation();
  const { status, recheck } = useLocationServicesGate();

  if (status === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Stitch.colors.primary} />
      </View>
    );
  }

  if (status === 'disabled') {
    return (
      <View style={styles.blocked}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="location-off" size={56} color={Stitch.colors.secondary} />
        </View>
        <Text style={styles.title}>{t('location.servicesRequiredTitle')}</Text>
        <Text style={styles.body}>{t('location.servicesRequiredBody')}</Text>
        <GradientButton
          title={t('location.enableLocationServices')}
          onPress={() => {
            void openLocationSettings();
          }}
          style={styles.button}
        />
        <GradientButton
          title={t('location.checkAgain')}
          onPress={() => {
            void recheck(true);
          }}
          variant="outline"
          style={styles.buttonSecondary}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.colors.background,
  },
  blocked: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    paddingHorizontal: Stitch.spacing.padding,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 340,
  },
  button: {
    alignSelf: 'stretch',
    maxWidth: 320,
  },
  buttonSecondary: {
    alignSelf: 'stretch',
    maxWidth: 320,
    marginTop: 12,
  },
});
