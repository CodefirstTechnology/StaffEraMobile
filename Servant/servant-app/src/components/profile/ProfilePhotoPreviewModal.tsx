import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';

type Props = {
  visible: boolean;
  uri: string | null;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function ProfilePhotoPreviewModal({
  visible,
  uri,
  saving = false,
  onSave,
  onCancel,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={saving ? undefined : onCancel}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('profile.photoPreviewTitle')}</Text>
          <Text style={styles.sub}>{t('profile.photoPreviewSub')}</Text>

          {uri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri }} style={styles.preview} accessibilityLabel={t('profile.photoPreviewTitle')} />
            </View>
          ) : null}

          <GradientButton
            title={saving ? t('common.saving') : t('common.save')}
            onPress={onSave}
            loading={saving}
            disabled={!uri}
            style={styles.saveBtn}
          />
          <GradientButton
            title={t('common.cancel')}
            variant="outline"
            onPress={onCancel}
            disabled={saving}
            style={styles.cancelBtn}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Stitch.colors.surface,
    borderTopLeftRadius: Stitch.radius.xl,
    borderTopRightRadius: Stitch.radius.xl,
    paddingHorizontal: Stitch.spacing.padding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Stitch.colors.outlineVariant,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Stitch.colors.primary,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  previewWrap: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: Stitch.colors.primaryFixed,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  saveBtn: { marginBottom: 10 },
  cancelBtn: { marginBottom: 0 },
});
