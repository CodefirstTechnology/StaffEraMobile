import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMyZones } from '@/hooks/useMyZones';

/** Returns whether the servant has zones and a guard for job actions. */
export function useZoneGate() {
  const { t } = useTranslation();
  const { data: zones = [], isLoading } = useMyZones();
  const hasZones = zones.length > 0;

  const goAddZone = () => router.push('/(main)/zones?add=1&from=home');

  const requireZone = (): boolean => {
    if (hasZones) return true;
    Alert.alert(t('zones.dashboardAlertTitle'), t('zones.actionBlocked'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('zones.addZone'), onPress: goAddZone },
    ]);
    return false;
  };

  return { zones, hasZones, isLoading, requireZone, goAddZone };
}
