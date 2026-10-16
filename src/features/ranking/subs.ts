// Subs ranking (GET /rankings/subs) and the sub fields S2 is adding to /rankings/current and /players/{id}.
// The generated types don't have them yet: the shapes live here, so S2's final contract is a one-file change.
import { useQuery } from '@tanstack/react-query'
import type { Match, PlayerDetail, Ranking } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'

export type RankingEntry = Ranking['entries'][number] & {
  /** The player's main-ranking points come mostly from sub appearances. */
  fromSubs?: boolean
}

export type SubsRankingEntry = Ranking['entries'][number] & {
  /** Sub appearances counted for this ranking. */
  appearances?: number | null
}

export type SubsRanking = Omit<Ranking, 'entries'> & { entries: SubsRankingEntry[] }

export type PlayerDetailWithSubs = PlayerDetail & { subsMatches?: Match[] | null }

export const useSubsRanking = (enabled: boolean) =>
  useQuery({ queryKey: ['v2', 'ranking', 'subs'], queryFn: () => v2get<SubsRanking>('/rankings/subs'), enabled })

/** True when this player took part as a substitute (filled someone else's place). */
export const playedAsSub = (m: Match, playerId: number) =>
  (m.participants ?? []).some((p) => p.player?.id === playerId && p.role === 'substitute')
