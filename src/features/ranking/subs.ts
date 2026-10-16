// Subs ranking (GET /rankings/subs) and the sub helpers shared by the ranking and player pages.
import { useQuery } from '@tanstack/react-query'
import type { Match, Schemas } from '@/api/v2'
import { V2NotFound, v2get } from '@/features/competitions/v2http'

export type SubsRanking = Schemas['SubsRanking']

// The API answers 404 while nobody has subbed yet: that is an empty ranking, not an error.
export const useSubsRanking = (enabled: boolean) =>
  useQuery({
    queryKey: ['v2', 'ranking', 'subs'],
    queryFn: () =>
      v2get<SubsRanking>('/rankings/subs').catch((err) => {
        if (err instanceof V2NotFound) return null
        throw err
      }),
    enabled,
  })

/** True when this player took part as a substitute (filled someone else's place). */
export const playedAsSub = (m: Match, playerId: number) =>
  (m.participants ?? []).some((p) => p.player?.id === playerId && p.role === 'substitute')
