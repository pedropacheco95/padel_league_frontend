import { useQuery } from '@tanstack/react-query'
import type { Match, PlayerComparison, PlayerDetail, PlayerSummary } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'

export const playersApi = {
  list: () => v2get<PlayerSummary[]>('/players'),
  get: (id: number) => v2get<PlayerDetail>(`/players/${id}`),
  matches: (id: number) => v2get<Match[]>(`/players/${id}/matches`),
  compare: (a: number, b: number) => v2get<PlayerComparison>('/players/compare', { a, b }),
}

export const useV2Players = () =>
  useQuery({ queryKey: ['v2', 'players'], queryFn: playersApi.list })

export const useV2Player = (id: number) =>
  useQuery({ queryKey: ['v2', 'player', id], queryFn: () => playersApi.get(id), enabled: Number.isFinite(id) })

export const useV2PlayerMatches = (id: number) =>
  useQuery({ queryKey: ['v2', 'player', id, 'matches'], queryFn: () => playersApi.matches(id), enabled: Number.isFinite(id) })

export const useV2PlayerComparison = (a?: number | null, b?: number | null) =>
  useQuery({
    queryKey: ['v2', 'players', 'compare', a, b],
    queryFn: () => playersApi.compare(a as number, b as number),
    enabled: !!a && !!b,
  })

export const byRanking = (x: PlayerSummary, y: PlayerSummary) =>
  (x.rankingPosition ?? Infinity) - (y.rankingPosition ?? Infinity)
