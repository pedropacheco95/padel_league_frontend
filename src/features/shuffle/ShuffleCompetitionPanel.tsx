// Shuffle competition page body, embedded by S3's /competitions/:id (contract: default export, props { competition }).
// Port of pages/Shuffle/ShufflePage.tsx onto v2: one stage per round ("jornada"), groups ranked by tier,
// standings for the whole competition; admins generate / delete the last round.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, StandingRow } from '@/api/v2'
import { useAuth } from '@/context/AuthContext'
import { errorMessage } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import CloseGroupButton from '@/features/results/CloseGroupButton'
import { Avatar } from '@/features/teams/PairChoice'
import { shuffleApi } from './api'

type Section = 'standings' | 'rounds'

const chip = (active: boolean) =>
  `whitespace-nowrap rounded-full px-[12px] py-[6px] text-[13px] ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`

function multipliers(c: Competition): Record<string, number> {
  const m = c.rules?.division_multipliers
  return m && typeof m === 'object' ? (m as Record<string, number>) : {}
}

export function ShuffleStandings({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return <p className="text-[14px] text-gray-500">Ainda sem classificação.</p>
  const num = 'py-[6px] pl-[6px] text-right tabular-nums'
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[340px] text-[14px]">
        <thead>
          <tr className="border-b text-left text-[12px] text-gray-500">
            <th className="py-[6px] pr-[6px]">#</th>
            <th className="py-[6px]">Jogador</th>
            <th className={num} title="Vitórias">V</th>
            <th className={num} title="Empates">E</th>
            <th className={num} title="Derrotas">D</th>
            <th className={`${num} hidden sm:table-cell`} title="Jogos ganhos">JG</th>
            <th className={`${num} hidden sm:table-cell`} title="Jogos perdidos">JP</th>
            <th className={num} title="Diferença de jogos">DJ</th>
            <th className={num}>Pts</th>
            <th className={num} title="Grupo na próxima jornada">Próx.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.player.id} className="border-b border-gray-100">
              <td className="py-[6px] pr-[6px] tabular-nums">{r.place}.º</td>
              <td className="max-w-[140px] py-[6px]">
                <span className="flex items-center gap-[8px]">
                  <Avatar player={r.player} size={24} />
                  <span className="truncate">{r.player.name}</span>
                </span>
              </td>
              <td className={num}>{r.wins ?? 0}</td>
              <td className={num}>{r.draws ?? 0}</td>
              <td className={num}>{r.losses ?? 0}</td>
              <td className={`${num} hidden sm:table-cell`}>{r.gamesWon ?? 0}</td>
              <td className={`${num} hidden sm:table-cell`}>{r.gamesLost ?? 0}</td>
              <td className={num}>{(r.gamesWon ?? 0) - (r.gamesLost ?? 0)}</td>
              <td className={`${num} font-semibold`}>{r.points}</td>
              <td className={num}>{r.nextGroupTier ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RoundAdmin({ competition }: { competition: Competition }) {
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const done = (message: string) => (next: Competition) => {
    qc.setQueryData(['v2', 'competitions', competition.id], next)
    qc.invalidateQueries({ queryKey: ['v2', 'competitions', competition.id, 'standings'] })
    toast.success(message)
    setConfirmDelete(false)
  }
  const generate = useMutation({
    mutationFn: () => shuffleApi.generateRound(competition.id),
    onSuccess: done('Jornada gerada.'),
    onError: err => toast.error(errorMessage(err, 'Não foi possível gerar a jornada.')),
  })
  const remove = useMutation({
    mutationFn: () => shuffleApi.deleteLastRound(competition.id),
    onSuccess: done('Última jornada apagada.'),
    onError: err => toast.error(errorMessage(err, 'Não foi possível apagar a jornada.')),
  })
  const busy = generate.isPending || remove.isPending
  const btn = 'rounded px-[12px] py-[6px] text-[13px] font-semibold disabled:opacity-40'
  return (
    <section className="mb-[18px] rounded-lg border border-amber-300 bg-amber-50 p-[12px]">
      <h3 className="mb-[8px] !text-[15px] font-semibold">Organização</h3>
      <div className="flex flex-wrap items-center gap-[8px]">
        <button className={`${btn} bg-gray-900 text-white`} disabled={busy} onClick={() => generate.mutate()}>
          {generate.isPending ? 'A gerar…' : 'Gerar próxima jornada'}
        </button>
        {confirmDelete ? (
          <>
            <span className="text-[13px]">Apagar a última jornada e os seus jogos?</span>
            <button className={`${btn} bg-red-700 text-white`} disabled={busy} onClick={() => remove.mutate()}>
              {remove.isPending ? 'A apagar…' : 'Sim, apagar'}
            </button>
            <button className="text-[13px] underline" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </>
        ) : (
          <button className={`${btn} border border-red-700 text-red-700`} disabled={busy} onClick={() => setConfirmDelete(true)}>
            Apagar última jornada
          </button>
        )}
      </div>
    </section>
  )
}

export default function ShuffleCompetitionPanel({ competition: initial }: { competition: Competition }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const [section, setSection] = useState<Section>('standings')
  const competition = useQuery({
    queryKey: ['v2', 'competitions', initial.id],
    queryFn: () => shuffleApi.competition(initial.id),
    initialData: initial,
    staleTime: 30_000,
  }).data
  const standings = useQuery({
    queryKey: ['v2', 'competitions', competition.id, 'standings'],
    queryFn: () => shuffleApi.standings(competition.id),
    enabled: section === 'standings',
  })

  const stages = [...(competition.stages ?? [])].sort((a, b) => b.number - a.number) // newest first
  const [stageId, setStageId] = useState<number | null>(null)
  const stage = stages.find(s => s.id === (stageId ?? competition.currentStageId)) ?? stages[0]
  const groups = [...(stage?.groups ?? [])].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
  const [groupId, setGroupId] = useState<number | null>(null)
  const activeGroupId = groups.some(g => g.id === groupId) ? groupId : groups[0]?.id ?? null
  const mult = multipliers(competition)

  return (
    <div className="pb-[32px]">
      <nav className="mb-[18px] flex gap-[4px] overflow-x-auto border-b border-gray-200" role="tablist">
        {([['standings', 'Classificação'], ['rounds', 'Jornadas']] as [Section, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={section === key}
            className={`whitespace-nowrap border-b-2 px-[12px] py-[10px] text-[15px] ${section === key ? 'border-gray-900 font-semibold' : 'border-transparent text-gray-600'}`}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {isAdmin && competition.status !== 'ended' && <RoundAdmin competition={competition} />}

      {section === 'standings' &&
        (standings.isError ? (
          <p className="text-[14px] text-red-700">Não foi possível carregar a classificação.</p>
        ) : (
          <ShuffleStandings rows={standings.data ?? []} />
        ))}

      {section === 'rounds' && (
        <div>
          {stages.length === 0 ? (
            <p className="text-[15px] text-gray-600">Ainda não há jornadas.</p>
          ) : (
            <>
              <div className="mb-[10px] flex gap-[6px] overflow-x-auto pb-[2px]" aria-label="Jornada">
                {stages.map(s => (
                  <button key={s.id} className={chip(s.id === stage?.id)} onClick={() => setStageId(s.id)}>
                    Jornada {s.number}
                  </button>
                ))}
              </div>
              <div className="mb-[12px] flex gap-[6px] overflow-x-auto pb-[2px]" aria-label="Grupo">
                {groups.map(g => (
                  <button key={g.id} className={chip(g.id === activeGroupId)} onClick={() => setGroupId(g.id)}>
                    {g.name}
                    {g.tier != null && mult[String(g.tier)] ? <span className="ml-[4px] opacity-70">×{mult[String(g.tier)]}</span> : null}
                  </button>
                ))}
              </div>
              {activeGroupId && (
                <>
                  <div className="mb-[10px]">
                    <CloseGroupButton groupId={activeGroupId} hasEnded={groups.find(g => g.id === activeGroupId)?.hasEnded} />
                  </div>
                  <GroupMatches key={activeGroupId} groupId={activeGroupId} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
