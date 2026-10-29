// Matches of one group by round: one inline result card per match (ResultCard), editable for
// signed-in players, read-only for everyone else.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { resultsApi } from './api'
import { groupMatchesKey } from './keys'
import ResultCard from './ResultCard'

export default function GroupMatches({ groupId }: { groupId: number }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const group = useQuery({ queryKey: ['v2', 'groups', groupId], queryFn: () => resultsApi.group(groupId) })
  const [round, setRound] = useState<number | null>(null)
  useEffect(() => {
    if (round === null && group.data) setRound(group.data.currentRound ?? group.data.rounds[0]?.number ?? 1)
  }, [group.data, round])

  const matches = useQuery({
    queryKey: [...groupMatchesKey(groupId), round],
    queryFn: () => resultsApi.groupMatches(groupId, round ?? undefined),
    enabled: round !== null,
  })

  if (group.isError || matches.isError) {
    return <p className="text-[14px] text-red-700">Não foi possível carregar os jogos.</p>
  }
  const rounds = group.data?.rounds ?? []
  const activeRound = rounds.find(r => r.number === round)
  const roundId = activeRound?.id
  // An ended group's results belong to the admins (the server 409s anyone else).
  const editable = !!user && (isAdmin || !group.data?.hasEnded)

  return (
    <div>
      {rounds.length > 1 && (
        <div className="mb-[12px] flex flex-wrap gap-[6px]" role="tablist" aria-label="Jornada">
          {rounds.map(r => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.number === round}
              className={`min-h-[40px] rounded-full px-[12px] py-[6px] text-[13px] ${r.number === round ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
              onClick={() => setRound(r.number)}
            >
              Jornada {r.number}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-[12px]">
        {(matches.data ?? []).map(m => (
          <li key={m.id}>
            <ResultCard match={m} roundId={roundId} roundDate={activeRound?.date} roundMatches={matches.data} editable={editable && m.status !== 'cancelled'} />
          </li>
        ))}
        {matches.data?.length === 0 && <li className="text-[14px] text-gray-500">Sem jogos nesta jornada.</li>}
      </ul>
    </div>
  )
}
