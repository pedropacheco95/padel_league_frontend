// Which of a stage's groups the signed-in player is in. The competition payload lists groups without
// members (GroupSummary), so this reads each group detail (cached under ['v2','groups',id], the key the
// cards and standings use too). `ready` is false while the lookup is still loading for a signed-in
// player, so the page can open straight on the right division instead of flashing groups[0].
import { useQueries } from '@tanstack/react-query'
import type { GroupSummary } from '@/api/v2'
import { resultsApi } from './api'

export function useMyGroup(groups: GroupSummary[], playerId: number | null | undefined): { mineId: number | null; ready: boolean } {
  const enabled = !!playerId
  const results = useQueries({
    queries: groups.map(g => ({
      queryKey: ['v2', 'groups', g.id],
      queryFn: () => resultsApi.group(g.id),
      enabled,
      staleTime: 60_000,
    })),
  })
  if (!enabled) return { mineId: null, ready: true }
  const mine = results.find(r => r.data?.members.some(m => m.id === playerId))
  const ready = !!mine || results.every(r => r.data || r.isError)
  return { mineId: mine?.data?.id ?? null, ready }
}
