import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { formatDate, formatTime } from '@/lib/i18n/format';
import { formatDurationFromHours } from '@/lib/formatDuration';

type HistoryEntry = {
  id: number;
  date: string;
  clockIn: string;
  hoursWorked?: number;
};

export default function TimeHistoryScreen() {
  const { t } = useTranslation();
  const { data } = useQuery<HistoryEntry[]>({
    queryKey: ['time-history'],
    queryFn: async () => {
      const res = await api.get('/time/history');
      return res.data.data.entries;
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('time.historyTitle')}</Text>
      <FlatList
        data={data || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <Text style={styles.time}>{formatTime(item.clockIn)}</Text>
            <Text style={styles.hours}>
              {t('time.hoursShort', {
                duration:
                  item.hoursWorked != null
                    ? formatDurationFromHours(item.hoursWorked)
                    : '—',
              })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Stitch.colors.background, padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  card: { backgroundColor: Stitch.colors.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  date: { fontWeight: '600', color: Stitch.colors.onBackground },
  time: { color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  hours: { color: Stitch.colors.primary, marginTop: 4, fontWeight: '600' },
});
