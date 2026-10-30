// Shuffle competition page body, embedded by S3's /competitions/:id (contract: default export, props { competition }).
// Port of pages/Shuffle/ShufflePage.tsx onto v2: one stage per round ("jornada"), groups ranked by tier,
// standings for the whole competition; admins generate / delete the last round.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, StandingRow } from '@/api/v2'
import StepperSelect from '@/components/v2/StepperSelect'
import { useHeaderSlot } from '@/components/v2/headerSlot'
import { useAuth } from '@/context/AuthContext'
import { errorMessage } from '@/features/results/api'
import GroupMatches from '@/features/results/GroupMatches'
import CloseGroupButton from '@/features/results/CloseGroupButton'
import { useMyGroup } from '@/features/results/useMyGroup'
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe'
import { Avatar } from '@/features/teams/PairChoice'
import { shuffleApi } from './api'

type Section = 'standings' | 'rounds'

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
            <th className={`${num} max-sm:hidden`} title="Jogos ganhos">JG</th>
            <th className={`${num} max-sm:hidden`} title="Jogos perdidos">JP</th>
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
              <td className={`${num} max-sm:hidden`}>{r.gamesWon ?? 0}</td>
              <td className={`${num} max-sm:hidden`}>{r.gamesLost ?? 0}</td>
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
  const btn = 'min-h-[40px] rounded px-[12px] py-[6px] text-[13px] font-semibold disabled:opacity-40'
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
            <button className="min-h-[40px] px-[8px] text-[13px] underline" onClick={() => setConfirmDelete(false)}>Cancelar</button>
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

  // Direction C filters: each stage is a jornada, so the header switcher reads "Jornada N" and the
  // group is the sticky sub-header the list can be swiped under. No bottom pill here (one round per stage).
  const stages = [...(competition.stages ?? [])].sort((a, b) => a.number - b.number)
  const [stageId, setStageId] = useState<number | null>(null)
  const stage = stages.find(s => s.id === (stageId ?? competition.currentStageId)) ?? stages[stages.length - 1]
  const groups = [...(stage?.groups ?? [])].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
  const [groupId, setGroupId] = useState<number | null>(null)
  const my = useMyGroup(groups, user?.playerId)
  const activeGroupId = groups.some(g => g.id === groupId) ? groupId : my.mineId ?? groups[0]?.id ?? null
  const activeIdx = groups.findIndex(g => g.id === activeGroupId)
  const stepGroup = (d: number) => {
    const g = groups[activeIdx + d]
    if (g) setGroupId(g.id)
  }
  // Swipes: the sticky group bar steps the group, the hero row steps the jornada (one stage per round).
  const stageIdx = stages.findIndex(s => s.id === stage?.id)
  const stepStage = (d: number) => {
    const s = stages[stageIdx + d]
    if (s) setStageId(s.id)
  }
  const swipeGroup = useHorizontalSwipe({ onSwipeLeft: () => stepGroup(1), onSwipeRight: () => stepGroup(-1), enabled: groups.length > 1 })
  const swipeStage = useHorizontalSwipe({ onSwipeLeft: () => stepStage(1), onSwipeRight: () => stepStage(-1), enabled: stages.length > 1 })
  const headerSlot = useHeaderSlot()
  const mult = multipliers(competition)

  const stageOptions = stages.map(s => ({ key: s.id, label: `Jornada ${s.number}`, current: s.id === competition.currentStageId }))
  const groupOptions = groups.map(g => ({
    key: g.id,
    label: g.name,
    mine: g.id === my.mineId,
    hint: g.tier != null && mult[String(g.tier)] ? `×${mult[String(g.tier)]}` : undefined,
  }))

  return (
    <div className="pb-[32px]">
      {/* Jornada switcher inside the hero (portal into PageHeader's slot, one shared background). */}
      {stages.length > 1 && (() => {
        const row = (
          <div
            className={headerSlot ? 'w-full pt-[4px]' : '-mx-[16px] -mt-[16px] mb-[4px] px-[16px] pb-[14px] pt-[2px]'}
            {...swipeStage}
            style={{ ...swipeStage.style, ...(headerSlot ? {} : { background: 'linear-gradient(135deg,#006A71,#48A6A7)' }) }}
          >
            <StepperSelect variant="header" title="Jornada" options={stageOptions} value={stage?.id ?? null} onChange={setStageId} />
          </div>
        )
        return headerSlot ? createPortal(row, headerSlot) : row
      })()}
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
              {groups.length > 1 && (
                // top: 0 — the site header (.c-global-header) is position: relative, not sticky.
                <div className="sticky top-0 z-30 -mx-[16px] mb-[12px] border-b border-gray-200 bg-white px-[8px] pb-[6px] pt-[8px]" {...swipeGroup} style={{ ...swipeGroup.style, boxShadow: '0 2px 6px rgba(20,26,40,.05)' }}>
                  <StepperSelect variant="subheader" title="Grupo" nudgeKey="group" options={groupOptions} value={activeGroupId} onChange={setGroupId} />
                </div>
              )}
              {!my.ready ? (
                <div className="loader" />
              ) : (
                activeGroupId && (
                  <>
                    <div className="mb-[10px]">
                      <CloseGroupButton groupId={activeGroupId} hasEnded={groups.find(g => g.id === activeGroupId)?.hasEnded} />
                    </div>
                    <GroupMatches key={activeGroupId} groupId={activeGroupId} />
                  </>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
