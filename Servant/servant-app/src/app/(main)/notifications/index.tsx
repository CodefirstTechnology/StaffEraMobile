import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

function formatWhen(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function getBookingId(n: AppNotification) {
  const id = n.data?.bookingId;
  return typeof id === 'number' ? id : null;
}

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const unread = notifications.filter((n) => !n.isRead).length;

  const openNotification = async (n: AppNotification) => {
    if (!n.isRead) {
      await api.patch(`/notifications/${n.id}/read`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }

    const bookingId = getBookingId(n);
    if (bookingId) {
      router.push(`/(main)/schedule/${bookingId}`);
    }
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Stitch.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Stitch.colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="notifications-none" size={48} color={Stitch.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Booking updates will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => openNotification(item)}>
              <GlassCard style={[styles.card, !item.isRead && styles.unreadCard]}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconWrap, !item.isRead && styles.iconUnread]}>
                    <MaterialIcons
                      name="notifications"
                      size={20}
                      color={item.isRead ? Stitch.colors.onSurfaceVariant : Stitch.colors.secondary}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.cardBodyText}>{item.body}</Text>
                    <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
                  </View>
                  {getBookingId(item) ? (
                    <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
                  ) : null}
                </View>
              </GlassCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(252, 248, 255, 0.92)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Stitch.typography.headline, color: Stitch.colors.primary },
  markAll: { fontSize: 13, fontWeight: '600', color: Stitch.colors.secondary },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { marginBottom: 0 },
  unreadCard: { borderColor: Stitch.colors.secondary + '44' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: { backgroundColor: Stitch.colors.secondaryContainer },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: Stitch.colors.onBackground },
  unreadTitle: { color: Stitch.colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Stitch.colors.secondary },
  cardBodyText: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  when: { fontSize: 11, color: Stitch.colors.onSurfaceVariant, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Stitch.colors.onBackground },
  emptySub: { fontSize: 13, color: Stitch.colors.onSurfaceVariant },
});
