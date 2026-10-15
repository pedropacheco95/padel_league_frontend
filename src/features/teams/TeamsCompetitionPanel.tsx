// Teams competition page body, embedded by S3's /competitions/:id under its header
// (contract: default export, props { competition }). Sections: pairs, divisions, matches, standings.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import CloseGroupButton from '@/features/results/CloseGroupButton'
import { teamsV2Api } from './api'
import PairChoice, { Avatar } from './PairChoice'

type Section = 'pairs' | 'divisions' | 'matches' | 'standings'
const SECTIONS: [Section, string][] = [
  ['pairs', 'Parelhas'],
  ['divisions', 'Divisões'],
  ['matches', 'Jogos'],
  ['standings', 'Classificação'],
]

const chip = (active: boolean) =>
  `whitespace-nowrap rounded-full px-[12px] py-[6px] text-[13px] ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`

export function TeamsStandings({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return <p className="text-[14px] text-gray-500">Ainda sem classificação.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b text-left text-[12px] text-gray-500">
            <th className="py-[6px] pr-[8px]">#</th>
            <th className="py-[6px] pr-[8px]">Jogador</th>
            <th className="py-[6px] pr-[8px] text-right" title="Jogos">J</th>
            <th className="py-[6px] pr-[8px] text-right" title="Sets ganhos">SG</th>
            <th className="py-[6px] pr-[8px] text-right" title="Sets empatados">SE</th>
            <th className="py-[6px] text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player.id} className="border-b border-gray-100">
              <td className="py-[6px] pr-[8px] tabular-nums">{i > 0 && rows[i - 1].place === r.place ? '' : `${r.place}.º`}</td>
              <td className="py-[6px] pr-[8px]">
                <span className="flex items-center gap-[8px]">
                  <Avatar player={r.player} size={24} />
                  <span className="truncate">{r.player.name}</span>
                </span>
              </td>
              <td className="py-[6px] pr-[8px] text-right tabular-nums">{r.played}</td>
              <td className="py-[6px] pr-[8px] text-right tabular-nums">{r.setsWon ?? '–'}</td>
              <td className="py-[6px] pr-[8px] text-right tabular-nums">{r.setsDrawn ?? '–'}</td>
              <td className="py-[6px] text-right font-semibold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupCard({ groupId, showStandings }: { groupId: number; showStandings?: boolean }) {
  const group = useQuery({ queryKey: ['v2', 'groups', groupId], queryFn: () => resultsApi.group(groupId) })
  if (!group.data) return null
  const g = group.data
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-[14px]">
      <h4 className="mb-[8px] text-[16px] font-semibold">
        {g.name}
        {g.rating ? <span className="ml-[8px] text-[12px] font-normal text-gray-500">{g.rating} pts ranking</span> : null}
      </h4>
      {showStandings ? (
        <TeamsStandings rows={g.standings} />
      ) : (
        <p className="text-[14px] text-gray-700">{g.members.map(m => m.name).join(', ')}</p>
      )}
      <div className="mt-[10px]">
        <CloseGroupButton groupId={g.id} hasEnded={g.hasEnded} />
      </div>
    </section>
  )
}

function StageAdmin({ competition, stage }: { competition: Competition; stage: Stage }) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['v2', 'competitions', competition.id] })
  const form = useMutation({
    mutationFn: () => teamsV2Api.formDivisions(stage.id),
    onSuccess: () => { toast.success('Divisões formadas.'); refresh() },
    onError: err => toast.error(errorMessage(err)),
  })
  const fixtures = useMutation({
    mutationFn: () => teamsV2Api.generateFixtures(competition.id, stage.id),
    onSuccess: () => { toast.success('Jogos gerados.'); refresh() },
    onError: err => toast.error(errorMessage(err)),
  })
  const noGroups = stage.groups.length === 0
  if (!noGroups && stage.rounds.length > 0) return null
  return (
    <div className="mb-[16px] rounded-lg border border-amber-300 bg-amber-50 p-[12px]">
      <p className="mb-[8px] text-[13px] font-semibold">Organização</p>
      {noGroups ? (
        <button
          className="rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
          disabled={!stage.pairingClosed || form.isPending}
          title={stage.pairingClosed ? undefined : 'Fecha primeiro as parelhas'}
          onClick={() => form.mutate()}
        >
          {form.isPending ? 'A formar…' : 'Formar divisões'}
        </button>
      ) : (
        <button
          className="rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
          disabled={fixtures.isPending}
          onClick={() => fixtures.mutate()}
        >
          {fixtures.isPending ? 'A gerar…' : 'Gerar jogos'}
        </button>
      )}
    </div>
  )
}

export default function TeamsCompetitionPanel({ competition: initial }: { competition: Competition }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const [section, setSection] = useState<Section>('pairs')
  const competitionQuery = useQuery({
    queryKey: ['v2', 'competitions', initial.id],
    queryFn: () => teamsV2Api.competition(initial.id),
    initialData: initial,
    staleTime: 30_000,
  })
  const competition = competitionQuery.data
  const stages = [...(competition.stages ?? [])].sort((a, b) => a.number - b.number)
  const [stageId, setStageId] = useState<number | null>(null)
  const stage = stages.find(s => s.id === (stageId ?? competition.currentStageId)) ?? stages[0]
  const [groupId, setGroupId] = useState<number | null>(null)
  const activeGroupId = stage?.groups.some(g => g.id === groupId) ? groupId : stage?.groups[0]?.id ?? null
  const [standingsScope, setStandingsScope] = useState<'edition' | 'stage'>('edition')

  const standings = useQuery({
    queryKey: ['v2', 'competitions', competition.id, 'standings'],
    queryFn: () => teamsV2Api.standings(competition.id),
    enabled: section === 'standings' && standingsScope === 'edition',
  })

  const stagePicker = stages.length > 1 && (
    <div className="mb-[14px] flex gap-[6px] overflow-x-auto pb-[2px]" aria-label="Mini-torneio">
      {stages.map(s => (
        <button key={s.id} className={chip(s.id === stage?.id)} onClick={() => setStageId(s.id)}>
          Mini-torneio {s.number}
        </button>
      ))}
    </div>
  )

  return (
    <div className="pb-[32px]">
      <nav className="mb-[18px] flex gap-[4px] overflow-x-auto border-b border-gray-200" role="tablist">
        {SECTIONS.map(([key, label]) => (
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

      {section === 'pairs' && <PairChoice competitionId={competition.id} />}

      {section === 'divisions' && (
        <div>
          {stagePicker}
          {stage && isAdmin && <StageAdmin competition={competition} stage={stage} />}
          {!stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">As divisões são formadas quando as parelhas fecham.</p>
          ) : (
            <div className="grid gap-[12px] md:grid-cols-2">
              {stage.groups.map(g => <GroupCard key={g.id} groupId={g.id} />)}
            </div>
          )}
        </div>
      )}

      {section === 'matches' && (
        <div>
          {stagePicker}
          {!stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">Ainda não há jogos neste mini-torneio.</p>
          ) : (
            <>
              {stage.groups.length > 1 && (
                <div className="mb-[12px] flex gap-[6px] overflow-x-auto pb-[2px]" aria-label="Divisão">
                  {stage.groups.map(g => (
                    <button key={g.id} className={chip(g.id === activeGroupId)} onClick={() => setGroupId(g.id)}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
              {activeGroupId && <GroupMatches key={activeGroupId} groupId={activeGroupId} />}
            </>
          )}
        </div>
      )}

      {section === 'standings' && (
        <div>
          <div className="mb-[14px] flex gap-[6px]">
            <button className={chip(standingsScope === 'edition')} onClick={() => setStandingsScope('edition')}>Total da edição</button>
            <button className={chip(standingsScope === 'stage')} onClick={() => setStandingsScope('stage')}>Por mini-torneio</button>
          </div>
          {standingsScope === 'edition' ? (
            standings.isError ? (
              <p className="text-[14px] text-red-700">Não foi possível carregar a classificação.</p>
            ) : (
              <TeamsStandings rows={standings.data ?? []} />
            )
          ) : (
            <>
              {stagePicker}
              {!stage || stage.groups.length === 0 ? (
                <p className="text-[15px] text-gray-600">Ainda sem divisões neste mini-torneio.</p>
              ) : (
                <div className="space-y-[12px]">
                  {stage.groups.map(g => <GroupCard key={g.id} groupId={g.id} showStandings />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
