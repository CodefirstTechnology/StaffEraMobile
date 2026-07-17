import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export type ServantZone = {
  id: number;
  name: string;
  description?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function useMyZones() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['my-zones'],
    queryFn: async () => {
      const res = await api.get('/zones/me');
      return res.data.data.zones as ServantZone[];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}
