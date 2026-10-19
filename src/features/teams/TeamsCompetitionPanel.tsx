// Teams competition page body, embedded by S3's /competitions/:id under its header
// (contract: default export, props { competition }). Sections: pairs, divisions, matches, standings.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { formatPoints } from '@/components/v2/PointsValue'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import CloseGroupButton from '@/features/results/CloseGroupButton'
import { buildTeamsShareMessage, nextRoundToPlay, type TeamsDivisionRound } from '@/lib/teamsShareMessage'
import { teamsV2Api } from './api'
import PairChoice, { Avatar } from './PairChoice'
import { DivisionsProjection, PartnerSimulator } from './TeamsProjection'

type Section = 'pairs' | 'divisions' | 'simulator' | 'matches' | 'standings'
const SECTIONS: [Section, string][] = [
  ['pairs', 'Parelhas'],
  ['divisions', 'Divisões'],
  ['simulator', 'Simulador'],
  ['matches', 'Jogos'],
  ['standings', 'Classificação'],
]

const chip = (active: boolean) =>
  `min-h-[40px] whitespace-nowrap rounded-full px-[12px] py-[6px] text-[13px] ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`

/** `stageNumbers` (edition total): one column per mini-tournament with the points it gave (StandingRow.stages);
 * on phones those replace the set columns. */
export function TeamsStandings({ rows, stageNumbers }: { rows: StandingRow[]; stageNumbers?: number[] }) {
  if (rows.length === 0) return <p className="text-[14px] text-gray-500">Ainda sem classificação.</p>
  const perStage = !!stageNumbers?.length
  const setCol = perStage ? 'max-sm:hidden' : ''
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
            <th className="py-[6px] pr-[8px] text-right" title="Jogos">J</th>
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
              <td className="py-[6px] pr-[8px] text-right tabular-nums">{r.played}</td>
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

/**
 * The next round's call sheet, ready to paste into WhatsApp — what Shuffle and
 * Clássica already give whoever runs the matchweek. Admin only, and fetched
 * only once asked for: it reads every division's matches.
 */
function RoundMessage({ competition, stage }: { competition: Competition; stage: Stage }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const message = useQuery({
    queryKey: ['v2', 'stages', stage.id, 'roundMessage'],
    enabled: open,
    queryFn: async () => {
      const divisions = await Promise.all(
        stage.groups.map(async (group): Promise<TeamsDivisionRound | null> => {
          const next = nextRoundToPlay(await resultsApi.groupMatches(group.id))
          return next && { tier: group.tier, name: group.name, round: next.round, matches: next.matches }
        }),
      )
      const title = competition.title || competition.label || competition.name
      return buildTeamsShareMessage(title, divisions.filter((d): d is TeamsDivisionRound => !!d))
    },
  })

  async function copy() {
    if (!message.data) return
    await navigator.clipboard.writeText(message.data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button
        className="mb-[16px] min-h-[40px] rounded border border-gray-300 px-[12px] py-[6px] text-[13px] font-semibold"
        onClick={() => setOpen(true)}
      >
        Mensagem da jornada
      </button>
    )
  }

  return (
    <div className="mb-[16px] rounded-lg border border-gray-200 bg-white p-[12px]">
      <div className="mb-[8px] flex items-center justify-between gap-[8px]">
        <strong className="text-[14px]">Mensagem da jornada</strong>
        <span className="flex gap-[8px]">
          <button
            className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
            disabled={!message.data}
            onClick={copy}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button className="min-h-[40px] px-[8px] text-[13px] text-gray-600 underline" onClick={() => setOpen(false)}>
            Fechar
          </button>
        </span>
      </div>
      {message.isPending ? (
        <div className="loader" />
      ) : message.isError ? (
        <p className="text-[14px] text-red-700">Não foi possível montar a mensagem.</p>
      ) : message.data ? (
        <textarea
          readOnly
          value={message.data}
          rows={16}
          className="w-full rounded border border-gray-300 p-[8px] text-[13px] leading-[1.35]"
        />
      ) : (
        <p className="text-[14px] text-gray-600">Não há jornada por jogar neste mini-torneio.</p>
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
  // Pair formation for the current mini-tournament: Divisões is the live projection, Simulador appears.
  const current = stages.find(s => s.id === competition.currentStageId)
  const forming = !!current && current.groups.length === 0
  const simulating = forming && !current.pairingClosed

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

      {section === 'divisions' && (
        <div>
          {stagePicker}
          {stage && isAdmin && <StageAdmin competition={competition} stage={stage} />}
          {forming && stage?.id === current.id ? (
            <DivisionsProjection competitionId={competition.id} onSimulate={simulating ? () => setSection('simulator') : undefined} />
          ) : !stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">As divisões são formadas quando as parelhas fecham.</p>
          ) : (
            <div className="grid gap-[12px] md:grid-cols-2">
              {stage.groups.map(g => <GroupCard key={g.id} groupId={g.id} />)}
            </div>
          )}
        </div>
      )}

      {section === 'simulator' && simulating && <PartnerSimulator competitionId={competition.id} />}

      {section === 'matches' && (
        <div>
          {stagePicker}
          {stage && isAdmin && stage.groups.length > 0 && <RoundMessage competition={competition} stage={stage} />}
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
              <>
                <p className="mb-[8px] text-[13px] text-gray-600">
                  Pontos de ranking somados dos mini-torneios fechados; presenças e sets contam todos os jogos.
                </p>
                <TeamsStandings rows={standings.data ?? []} stageNumbers={stages.map(s => s.number)} />
              </>
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
