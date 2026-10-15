// Matches of one group by round, with result entry and absences for signed-in players.
// Self-contained so S3's MatchCard can replace the row later via its `actions` slot.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Match } from '@/api/v2'
import { useAuth } from '@/context/AuthContext'
import { resultsApi } from './api'
import AbsenceDialog from './AbsenceDialog'
import ResultEntryDialog, { groupMatchesKey } from './ResultEntryDialog'
import { scoreText, sideNames } from './matchText'

export function MatchActions({ match, roundId }: { match: Match; roundId?: number }) {
  const { user } = useAuth()
  const [dialog, setDialog] = useState<'result' | 'absence' | null>(null)
  if (!user || match.status === 'cancelled') return null
  const played = match.status !== 'scheduled'
  return (
    <div className="flex gap-[8px]">
      <button
        className="rounded bg-gray-900 px-[10px] py-[6px] text-[13px] font-semibold text-white"
        onClick={() => setDialog('result')}
      >
        {played ? 'Editar resultado' : 'Resultado'}
      </button>
      {!played && (
        <button className="rounded border border-gray-300 px-[10px] py-[6px] text-[13px]" onClick={() => setDialog('absence')}>
          Falta
        </button>
      )}
      <ResultEntryDialog match={match} roundId={roundId} open={dialog === 'result'} onOpenChange={o => setDialog(o ? 'result' : null)} />
      <AbsenceDialog match={match} roundId={roundId} open={dialog === 'absence'} onOpenChange={o => setDialog(o ? 'absence' : null)} />
    </div>
  )
}

function MatchRow({ match, roundId }: { match: Match; roundId?: number }) {
  const [home, away] = sideNames(match)
  const score = scoreText(match)
  const points = match.format === 'teams' && match.homeScore != null ? `${match.homeScore}–${match.awayScore}` : null
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-[12px]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-[12px] gap-y-[4px] text-[15px]">
        <span className={`truncate ${match.winner === 'home' ? 'font-semibold' : ''}`}>{home}</span>
        <span className="row-span-2 text-right text-[14px] tabular-nums">
          {score ?? <span className="text-gray-400">por jogar</span>}
          {points && <span className="block text-[12px] text-gray-500">{points} pts</span>}
        </span>
        <span className={`truncate ${match.winner === 'away' ? 'font-semibold' : ''}`}>{away}</span>
      </div>
      {(match.absences ?? []).length > 0 && (
        <p className="mt-[6px] text-[12px] text-amber-800">
          Faltas: {match.absences!.map(a => `${a.player.name} (${a.substitute?.name ?? 'substituto desconhecido'})`).join(', ')}
        </p>
      )}
      <div className="mt-[10px]">
        <MatchActions match={match} roundId={roundId} />
      </div>
    </li>
  )
}

export default function GroupMatches({ groupId }: { groupId: number }) {
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
  const roundId = rounds.find(r => r.number === round)?.id

  return (
    <div>
      {rounds.length > 1 && (
        <div className="mb-[12px] flex flex-wrap gap-[6px]" role="tablist" aria-label="Jornada">
          {rounds.map(r => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.number === round}
              className={`rounded-full px-[12px] py-[6px] text-[13px] ${r.number === round ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
              onClick={() => setRound(r.number)}
            >
              Jornada {r.number}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-[8px]">
        {(matches.data ?? []).map(m => <MatchRow key={m.id} match={m} roundId={roundId} />)}
        {matches.data?.length === 0 && <li className="text-[14px] text-gray-500">Sem jogos nesta jornada.</li>}
      </ul>
    </div>
  )
}
