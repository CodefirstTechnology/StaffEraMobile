import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Brand } from '@/constants/theme';

export default function TimeHistoryScreen() {
  const { data } = useQuery({
    queryKey: ['time-history'],
    queryFn: async () => {
      const res = await api.get('/time/history');
      return res.data.data.entries;
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time History</Text>
      <FlatList
        data={data || []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        renderItem={({ item }: { item: { date: string; hoursWorked?: number; clockIn: string } }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
            <Text>{new Date(item.clockIn).toLocaleTimeString()}</Text>
            <Text style={styles.hours}>{item.hoursWorked?.toFixed(1) || '—'} hrs</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background, padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: Brand.primary, marginBottom: 16 },
  card: { backgroundColor: Brand.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  date: { fontWeight: '600' },
  hours: { color: Brand.primary, marginTop: 4 },
});
