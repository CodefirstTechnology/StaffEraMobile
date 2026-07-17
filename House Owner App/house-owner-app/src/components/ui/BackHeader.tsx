import { type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

const SIDE_WIDTH = 96;

type Props = {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function BackHeader({ title, onBack, right }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={24} color={Stitch.colors.primary} />
        </TouchableOpacity>
      </View>

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleFill} />
      )}

      <View style={[styles.side, styles.sideEnd]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 12,
    backgroundColor: 'rgba(252, 248, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
  },
  side: {
    width: SIDE_WIDTH,
    minHeight: 40,
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  title: {
    flex: 1,
    ...Stitch.typography.headline,
    fontSize: 18,
    color: Stitch.colors.primary,
    textAlign: 'center',
  },
  titleFill: {
    flex: 1,
  },
});
