import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

type Props = {
  locationLabel?: string;
  location?: string;
  title?: string;
  onProfile?: () => void;
  unreadNotifications?: number;
  onNotifications?: () => void;
};

export function ScreenHeader({
  locationLabel = 'Your area',
  location = 'Mumbai, India',
  title,
  onProfile,
  unreadNotifications = 0,
  onNotifications,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.loc}>
          <MaterialIcons name="location-on" size={22} color={Stitch.colors.primary} />
          <View>
            <Text style={styles.locLabel}>{locationLabel}</Text>
            <Text style={styles.locValue}>{location}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {onNotifications ? (
            <Pressable onPress={onNotifications} style={styles.avatar}>
              <MaterialIcons name="notifications" size={22} color={Stitch.colors.primary} />
              {unreadNotifications > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {title ? (
            <Text style={styles.brand}>{title}</Text>
          ) : (
            <Pressable onPress={onProfile} style={styles.avatar}>
              <MaterialIcons name="person" size={22} color={Stitch.colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Stitch.spacing.padding,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: 'rgba(252, 248, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  locLabel: { ...Stitch.typography.caption, color: Stitch.colors.onSurfaceVariant },
  locValue: { ...Stitch.typography.label, color: Stitch.colors.onBackground },
  brand: { ...Stitch.typography.headline, color: Stitch.colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Stitch.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
