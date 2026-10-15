import { useQuery } from '@tanstack/react-query'
import type { Ranking, RankingExplanation } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'

export const rankingApi = {
  current: () => v2get<Ranking>('/rankings/current'),
  snapshot: (id: number) => v2get<Ranking>(`/rankings/${id}`),
  explain: (playerId: number) => v2get<RankingExplanation>(`/rankings/players/${playerId}`),
}

export const useCurrentRanking = () => useQuery({ queryKey: ['v2', 'ranking', 'current'], queryFn: rankingApi.current })

export const useRankingExplanation = (playerId: number | null) =>
  useQuery({ queryKey: ['v2', 'ranking', 'player', playerId], queryFn: () => rankingApi.explain(playerId!), enabled: playerId !== null })
