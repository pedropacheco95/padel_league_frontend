// Teams competition page body, embedded by S3's /competitions/:id under its header
// (contract: default export, props { competition }). Sections: standings (per mini-tournament; before it
// starts, the projected/closed pairings), matches, pairs, ranking points won this edition, simulator.
import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { formatPoints } from '@/components/v2/PointsValue'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import CloseGroupButton from '@/features/results/CloseGroupButton'
import { buildTeamsShareMessage } from '@/lib/teamsShareMessage'
import { teamsV2Api } from './api'
import PairChoice, { Avatar } from './PairChoice'
import { DivisionsProjection, PartnerSimulator } from './TeamsProjection'

type Section = 'standings' | 'matches' | 'pairs' | 'points' | 'simulator'
const SECTIONS: [Section, string][] = [
  ['standings', 'Classificação'],
  ['matches', 'Jogos'],
  ['pairs', 'Parelhas'],
  ['points', 'Pontos de ranking'],
  ['simulator', 'Simulador'],
]

const chip = (active: boolean) =>
  `min-h-[40px] whitespace-nowrap rounded-full px-[12px] py-[6px] text-[13px] ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`

/** `stageNumbers` (edition total): one column per mini-tournament with the points it gave (StandingRow.stages);
 * on phones those replace the set columns. */
export function TeamsStandings({ rows, stageNumbers }: { rows: StandingRow[]; stageNumbers?: number[] }) {
  if (rows.length === 0) return <p className="text-[14px] text-gray-500">Ainda sem classificação.</p>
  // Edition total: ranking points only. Games and sets are left out on purpose: a set won in the 6.ª
  // would weigh the same as one in the 1.ª.
  const perStage = !!stageNumbers?.length
  const setCol = perStage ? 'hidden' : ''
  const stageCell = (r: StandingRow, n: number) => {
    const st = r.stages?.find(x => x.stageNumber === n)
    if (!st || st.points == null) return <span className="text-gray-600">–</span>
    const title = [st.place ? `${st.place}.º` : null, st.tier ? `${st.tier}.ª Divisão` : null].filter(Boolean).join(' · ')
    return <span title={title || undefined}>{formatPoints(st.points)}</span>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b text-left text-[12px] text-gray-500">
            <th className="py-[6px] pr-[8px]">#</th>
            <th className="py-[6px] pr-[8px]">Jogador</th>
            <th className={`py-[6px] pr-[8px] text-right ${setCol}`} title="Jogos">J</th>
            <th className={`py-[6px] pr-[8px] text-right ${setCol}`} title="Sets ganhos">SG</th>
            <th className={`py-[6px] pr-[8px] text-right ${setCol}`} title="Sets empatados">SE</th>
            {stageNumbers?.map(n => (
              <th key={n} className="py-[6px] pr-[8px] text-right" title={`Mini-torneio ${n}`}>M{n}</th>
            ))}
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
                  <span className="max-w-[110px] truncate sm:max-w-none">{r.player.name}</span>
                </span>
              </td>
              <td className={`py-[6px] pr-[8px] text-right tabular-nums ${setCol}`}>{r.played}</td>
              <td className={`py-[6px] pr-[8px] text-right tabular-nums ${setCol}`}>{r.setsWon ?? '–'}</td>
              <td className={`py-[6px] pr-[8px] text-right tabular-nums ${setCol}`}>{r.setsDrawn ?? '–'}</td>
              {stageNumbers?.map(n => (
                <td key={n} className="py-[6px] pr-[8px] text-right tabular-nums">{stageCell(r, n)}</td>
              ))}
              <td className="py-[6px] text-right font-semibold tabular-nums">{formatPoints(r.points)}</td>
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
        {g.rating ? <span className="ml-[8px] text-[12px] font-normal text-gray-500">{formatPoints(g.rating)} pts ranking</span> : null}
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
  // Forming the divisions also creates their fixtures (POST /competitions/{id}/fixtures is Clássica only).
  if (stage.groups.length > 0) return null
  return (
    <div className="mb-[16px] rounded-lg border border-amber-300 bg-amber-50 p-[12px]">
      <p className="mb-[8px] text-[13px] font-semibold">Organização</p>
      <button
        className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
        disabled={!stage.pairingClosed || form.isPending}
        title={stage.pairingClosed ? undefined : 'Fecha primeiro as parelhas'}
        onClick={() => form.mutate()}
      >
        {form.isPending ? 'A formar…' : 'Formar divisões'}
      </button>
    </div>
  )
}

/** Admin: the round's WhatsApp message (same layout as Clássica and Shuffle). Defaults to the first round with
 * matches still to play. */
function ShareMessage({ competition, stage }: { competition: Competition; stage: Stage }) {
  const [round, setRound] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const results = useQueries({
    queries: stage.groups.map(g => ({
      queryKey: ['v2', 'groups', g.id, 'matches'],
      queryFn: () => resultsApi.groupMatches(g.id),
    })),
  })
  if (results.some(r => !r.data)) return null
  const all = results.flatMap(r => r.data ?? [])
  const rounds = [...new Set(all.map(m => m.round))].sort((a, b) => a - b)
  if (rounds.length === 0) return null
  const pending = all.filter(m => m.status === 'scheduled').map(m => m.round)
  const active = round ?? (pending.length ? Math.min(...pending) : rounds[rounds.length - 1])
  const message = buildTeamsShareMessage(
    competition.title || competition.label,
    stage.number,
    active,
    stage.groups.map((g, i) => ({
      tier: g.tier ?? i + 1,
      matches: (results[i].data ?? []).filter(m => m.round === active && m.status !== 'cancelled'),
    })),
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Seleciona o texto e copia à mão.')
    }
  }
  return (
    <section className="mb-[16px] rounded-lg border border-gray-200 bg-white p-[12px]">
      <div className="mb-[8px] flex flex-wrap items-center justify-between gap-[8px]">
        <p className="text-[14px] font-semibold">Mensagem da jornada</p>
        <div className="flex flex-wrap gap-[6px]">
          {rounds.map(r => (
            <button key={r} className={chip(r === active)} onClick={() => setRound(r)}>Jornada {r}</button>
          ))}
          <button className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white" onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={message}
        rows={12}
        className="w-full rounded border border-gray-300 p-[8px] text-[13px] leading-[1.35]"
      />
    </section>
  )
}

export default function TeamsCompetitionPanel({ competition: initial }: { competition: Competition }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const [section, setSection] = useState<Section>('standings')
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
  // Pair formation for the current mini-tournament: Classificação shows the live projection, Simulador appears.
  const current = stages.find(s => s.id === competition.currentStageId)
  const forming = !!current && current.groups.length === 0
  const simulating = forming && !current.pairingClosed

  const standings = useQuery({
    queryKey: ['v2', 'competitions', competition.id, 'standings'],
    queryFn: () => teamsV2Api.standings(competition.id),
    enabled: section === 'points',
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
        {SECTIONS.filter(([key]) => key !== 'simulator' || simulating).map(([key, label]) => (
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

      {section === 'simulator' && simulating && <PartnerSimulator competitionId={competition.id} />}

      {section === 'matches' && (
        <div>
          {stagePicker}
          {!stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">Ainda não há jogos neste mini-torneio.</p>
          ) : (
            <>
              {isAdmin && <ShareMessage competition={competition} stage={stage} />}
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
          {stagePicker}
          {stage && isAdmin && <StageAdmin competition={competition} stage={stage} />}
          {forming && stage?.id === current.id ? (
            <DivisionsProjection competitionId={competition.id} onSimulate={simulating ? () => setSection('simulator') : undefined} />
          ) : !stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">As divisões deste mini-torneio são formadas quando as parelhas fecharem.</p>
          ) : (
            <div className="space-y-[12px]">
              {stage.groups.map(g => <GroupCard key={g.id} groupId={g.id} showStandings />)}
            </div>
          )}
        </div>
      )}

      {section === 'points' && (
        <div>
          <div className="mb-[12px] rounded-lg border border-gray-200 bg-gray-50 p-[12px] text-[13px] text-gray-700">
            <p className="font-semibold text-gray-900">Pontos de ranking ganhos nesta edição</p>
            <p className="mt-[4px]">
              Não é uma classificação da Teams: cada mini-torneio tem a sua. Isto é o que cada jogador já somou para o
              ranking geral, mini-torneio a mini-torneio. As divisões do próximo mini-torneio e da próxima edição saem do
              ranking geral.
            </p>
          </div>
          {standings.isError ? (
            <p className="text-[14px] text-red-700">Não foi possível carregar os pontos.</p>
          ) : standings.data && !standings.data.some(r => r.points) ? (
            <p className="text-[14px] text-gray-500">Ainda sem pontos: aparecem quando o primeiro mini-torneio fechar.</p>
          ) : (
            <TeamsStandings rows={standings.data ?? []} stageNumbers={stages.map(s => s.number)} />
          )}
        </div>
      )}
    </div>
  )
}
