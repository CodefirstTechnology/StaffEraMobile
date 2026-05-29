import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type Skill = {
  id: number;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get('/skills');
      return res.data.data.skills as Skill[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
