import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import api from '@/lib/api';
import {
  homeSummaryPollInterval,
  type HomeSummary,
} from '@/lib/homeSummary';

type SearchLocation = { latitude: number; longitude: number } | null;

export function useHomeSummary(searchLocation: SearchLocation, locLoading: boolean) {
  const query = useQuery({
    queryKey: [
      'home-summary',
      searchLocation?.latitude,
      searchLocation?.longitude,
    ],
    enabled: !locLoading,
    queryFn: async () => {
      const params =
        searchLocation != null
          ? {
              latitude: searchLocation.latitude,
              longitude: searchLocation.longitude,
            }
          : undefined;
      const res = await api.get('/bookings/home-summary', { params });
      return res.data.data as HomeSummary;
    },
    refetchInterval: (q) => homeSummaryPollInterval(q.state.data),
  });

  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query.refetch]),
  );

  return query;
}
