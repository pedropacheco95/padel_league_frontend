import { useQuery } from '@tanstack/react-query'
import type { PlayerStory } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'

export const useV2PlayerStory = (id: number) =>
  useQuery({
    queryKey: ['v2', 'player', id, 'story'],
    queryFn: () => v2get<PlayerStory>(`/players/${id}/story`),
    enabled: Number.isFinite(id),
  })
