// Teams competition page body, embedded by S3's /competitions/:id under its header
// (contract: default export, props { competition }). Sections: standings (per mini-tournament; before it
// starts, the projected/closed pairings), matches, pairs, ranking points won this edition, simulator.
// The mini-torneio switcher sits in the header row above the tabs (direction C filters).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { formatPoints } from '@/components/v2/PointsValue'
import StepperSelect from '@/components/v2/StepperSelect'
import { useHeaderSlot } from '@/components/v2/headerSlot'
import { useAuth } from '@/context/AuthContext'
import { blurAfterPointerClick } from '@/lib/focus'
import { errorMessage, resultsApi } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import { useMyGroup } from '@/features/results/useMyGroup'
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe'
import { teamsV2Api } from './api'
import PairChoice, { Avatar } from './PairChoice'
import ShareMessagePanel from './ShareMessagePanel'
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

/** Sheet hint for a mini-tournament: its status, or the month of its first night when still planned. */
function stageHint(s: Stage): string | undefined {
  if (s.status === 'running') return 'a decorrer'
  if (s.status === 'ended') return 'terminado'
  const first = s.rounds.map(r => r.date).filter(Boolean).sort()[0]
  if (!first) return undefined
  const d = new Date(first)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('pt-PT', { month: 'short' })
}

/** True once `el` has scrolled out of view above (IntersectionObserver; false where it does not exist). */
function useScrolledPast(el: HTMLElement | null): boolean {
  const [past, setPast] = useState(false)
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [el])
  return past
}

export default function TeamsCompetitionPanel({ competition: initial }: { competition: Competition }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  // ?section=matches&group=<id> is where "Editar jogos" lands (EditGamesPage); read once, on mount.
  const [params] = useSearchParams()
  const [section, setSection] = useState<Section>(() => SECTIONS.find(([k]) => k === params.get('section'))?.[0] ?? 'standings')
  const competitionQuery = useQuery({
    queryKey: ['v2', 'competitions', initial.id],
    queryFn: () => teamsV2Api.competition(initial.id),
    initialData: initial,
    staleTime: 30_000,
  })
  const competition = competitionQuery.data
  const stages = [...(competition.stages ?? [])].sort((a, b) => a.number - b.number)
  // Filters (direction C, Pedro 30 Oct): the mini-torneio is a page-level switcher in the header and
  // applies to every tab; the division is a sticky sub-header the list can be swiped under; the jornada
  // is a floating pill (GroupMatches). All three live here so the jornada survives a division change.
  const [stageId, setStageId] = useState<number | null>(null)
  const stage = stages.find(s => s.id === (stageId ?? competition.currentStageId)) ?? stages[0]
  const groups = [...(stage?.groups ?? [])].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99))
  const [groupId, setGroupId] = useState<number | null>(() => Number(params.get('group')) || null)
  const [round, setRound] = useState<number | null>(null)
  // Opens on the signed-in player's own division (groups[0] for everyone else).
  const my = useMyGroup(groups, user?.playerId)
  const activeGroupId = groups.some(g => g.id === groupId) ? groupId : my.mineId ?? groups[0]?.id ?? null
  const activeIdx = groups.findIndex(g => g.id === activeGroupId)
  const stepGroup = (d: number) => {
    const g = groups[activeIdx + d]
    if (g) setGroupId(g.id)
  }
  const pickStage = (id: number) => {
    setStageId(id)
    setRound(null) // the jornada numbers restart in each mini-tournament
  }
  // Swipes (Pedro, 30 Oct): the match list steps the jornada (inside GroupMatches), the sticky division
  // bar steps the division, the hero switcher row steps the mini-torneio. Left = next, right = previous.
  const stageIdx = stages.findIndex(s => s.id === stage?.id)
  const stepStage = (d: number) => {
    const s = stages[stageIdx + d]
    if (s) pickStage(s.id)
  }
  const swipeDivision = useHorizontalSwipe({ onSwipeLeft: () => stepGroup(1), onSwipeRight: () => stepGroup(-1), enabled: groups.length > 1 })
  const swipeStage = useHorizontalSwipe({ onSwipeLeft: () => stepStage(1), onSwipeRight: () => stepStage(-1), enabled: stages.length > 1 })
  const [heroRow, setHeroRow] = useState<HTMLDivElement | null>(null)
  const headerSlot = useHeaderSlot()
  const heroHidden = useScrolledPast(heroRow)
  // Pair formation for the current mini-tournament: Classificação shows the live projection, Simulador appears.
  const current = stages.find(s => s.id === competition.currentStageId)
  const forming = !!current && current.groups.length === 0
  const simulating = forming && !current.pairingClosed

  const standings = useQuery({
    queryKey: ['v2', 'competitions', competition.id, 'standings'],
    queryFn: () => teamsV2Api.standings(competition.id),
    enabled: section === 'points',
  })

  const stageOptions = stages.map(s => ({
    key: s.id,
    label: `Mini-torneio ${s.number}`,
    hint: stageHint(s),
    current: s.id === competition.currentStageId,
  }))
  const groupOptions = groups.map(g => ({ key: g.id, label: g.name, mine: g.id === my.mineId }))

  return (
    <div className="pb-[32px]">
      {/* Mini-torneio switcher inside the hero (portal into PageHeader's slot, one shared background);
          when there is no header slot it is the panel's first row. Hidden with a single mini-tournament. */}
      {stages.length > 1 && (() => {
        const row = (
          <div
            ref={setHeroRow}
            className={headerSlot ? 'w-full pt-[4px]' : '-mx-[16px] -mt-[16px] mb-[4px] px-[16px] pb-[14px] pt-[2px]'}
            {...swipeStage}
            style={{ ...swipeStage.style, ...(headerSlot ? {} : { background: 'linear-gradient(135deg,#006A71,#48A6A7)' }) }}
          >
            <StepperSelect variant="header" title="Mini-torneio" options={stageOptions} value={stage?.id ?? null} onChange={pickStage} />
          </div>
        )
        return headerSlot ? createPortal(row, headerSlot) : row
      })()}
      <nav className="mb-[18px] flex gap-[4px] overflow-x-auto border-b border-gray-200" role="tablist">
        {SECTIONS.filter(([key]) => key !== 'simulator' || simulating).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={section === key}
            className={`whitespace-nowrap border-b-2 px-[12px] py-[10px] text-[15px] ${section === key ? 'border-gray-900 font-semibold' : 'border-transparent text-gray-600'}`}
            onClick={e => {
              blurAfterPointerClick(e)
              setSection(key)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {section === 'pairs' && <PairChoice competitionId={competition.id} />}

      {section === 'simulator' && simulating && <PartnerSimulator competitionId={competition.id} />}

      {section === 'matches' && (
        <div>
          {!stage || groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">Ainda não há jogos neste mini-torneio.</p>
          ) : (
            <>
              {/* Sticky at top: 0 because the site header (.c-global-header, src/styles/_general.scss) is
                  position: relative, not sticky, so nothing sits above this bar once the page scrolls. The
                  compact title bar with the "MT1 ▾" chip appears once the hero switcher has scrolled away. */}
              {(groups.length > 1 || (heroHidden && stages.length > 1)) && (
                <div className="sticky top-0 z-30 -mx-[16px] mb-[12px] bg-white" {...swipeDivision} style={{ ...swipeDivision.style, boxShadow: '0 2px 6px rgba(20,26,40,.05)' }}>
                  {heroHidden && stages.length > 1 && (
                    <div className="flex items-center gap-[8px] py-[8px] pl-[16px] pr-[12px] text-white" style={{ background: '#00585e' }}>
                      <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{competition.title || competition.label}</span>
                      <StepperSelect variant="chip" title="Mini-torneio" chipLabel={`MT${stage.number}`} options={stageOptions} value={stage.id} onChange={pickStage} />
                    </div>
                  )}
                  {groups.length > 1 && (
                    <div className="border-b border-gray-200 px-[8px] pb-[6px] pt-[8px]">
                      <StepperSelect variant="subheader" title="Divisão" nudgeKey="division" options={groupOptions} value={activeGroupId} onChange={setGroupId} />
                    </div>
                  )}
                </div>
              )}
              {isAdmin && <ShareMessagePanel competition={competition} stage={stage} />}
              {!my.ready ? (
                <div className="loader" />
              ) : (
                activeGroupId && <GroupMatches key={activeGroupId} groupId={activeGroupId} round={round} onRound={setRound} />
              )}
            </>
          )}
        </div>
      )}

      {section === 'standings' && (
        <div>
          {stage && isAdmin && <StageAdmin competition={competition} stage={stage} />}
          {forming && stage?.id === current.id ? (
            <DivisionsProjection competitionId={competition.id} onSimulate={simulating ? () => setSection('simulator') : undefined} />
          ) : !stage || stage.groups.length === 0 ? (
            <p className="text-[15px] text-gray-600">As divisões deste mini-torneio são formadas quando as parelhas fecharem.</p>
          ) : (
            <div className="space-y-[12px]">
              {groups.map(g => <GroupCard key={g.id} groupId={g.id} showStandings />)}
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
