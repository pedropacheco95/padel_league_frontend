// Matches of one group by round: one inline result card per match (ResultCard), editable for
// signed-in players, read-only for everyone else. The jornada is picked on a floating pill at the
// bottom of the screen (StepperSelect `pill`). Its state is either lifted by the parent (`round` +
// `onRound`, so the Teams page keeps the jornada while the division changes) or kept here.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import StepperSelect from '@/components/v2/StepperSelect'
import SwipeDebugOverlay from '@/components/v2/SwipeDebugOverlay'
import { useAuth } from '@/context/AuthContext'
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe'
import { resultsApi } from './api'
import { groupMatchesKey } from './keys'
import ResultCard from './ResultCard'
import { shortDate } from './resultDraft'

export default function GroupMatches({
  groupId,
  round: roundProp,
  onRound,
}: {
  groupId: number
  round?: number | null
  onRound?: (round: number) => void
}) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const group = useQuery({ queryKey: ['v2', 'groups', groupId], queryFn: () => resultsApi.group(groupId) })
  const [ownRound, setOwnRound] = useState<number | null>(null)
  const controlled = roundProp !== undefined
  const round = controlled ? roundProp : ownRound
  const setRound = (n: number) => {
    if (!controlled) setOwnRound(n)
    onRound?.(n)
  }
  useEffect(() => {
    if (round === null && group.data) setRound(group.data.currentRound ?? group.data.rounds[0]?.number ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.data, round])

  const matches = useQuery({
    queryKey: [...groupMatchesKey(groupId), round],
    queryFn: () => resultsApi.groupMatches(groupId, round ?? undefined),
    enabled: round !== null,
  })

  const rounds = group.data?.rounds ?? []
  // Swiping the list sideways steps the jornada (Pedro, 30 Oct: "pulling to the side would show me the
  // next matchweek"); left = next, right = previous. The pill animates its label on the change.
  const roundIdx = rounds.findIndex(r => r.number === round)
  const stepRound = (d: number) => {
    const r = rounds[roundIdx + d]
    if (r) setRound(r.number)
  }
  const swipe = useHorizontalSwipe({ onSwipeLeft: () => stepRound(1), onSwipeRight: () => stepRound(-1), enabled: rounds.length > 1 })

  if (group.isError || matches.isError) {
    return <p className="text-[14px] text-red-700">Não foi possível carregar os jogos.</p>
  }
  const activeRound = rounds.find(r => r.number === round)
  const roundId = activeRound?.id
  // An ended group's results belong to the admins (the server 409s anyone else).
  const editable = !!user && (isAdmin || !group.data?.hasEnded)
  const pill = rounds.length > 1

  return (
    // Bottom padding keeps the last card clear of the floating pill.
    <div className={pill ? 'pb-[96px]' : ''} {...swipe}>
      <SwipeDebugOverlay />
      <ul className="space-y-[12px]">
        {(matches.data ?? []).map(m => (
          <li key={m.id}>
            <ResultCard match={m} roundId={roundId} roundDate={activeRound?.date} roundMatches={matches.data} editable={editable && m.status !== 'cancelled'} />
          </li>
        ))}
        {matches.data?.length === 0 && <li className="text-[14px] text-gray-500">Sem jogos nesta jornada.</li>}
      </ul>
      {pill && (
        <StepperSelect
          variant="pill"
          title="Jornada"
          value={round}
          onChange={setRound}
          options={rounds.map(r => ({
            key: r.number,
            label: `Jornada ${r.number}`,
            hint: shortDate(r.date) ?? undefined,
            current: r.number === group.data?.currentRound,
          }))}
        />
      )}
    </div>
  )
}
