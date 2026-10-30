// Group (division) page: standings, matches per round, calendar.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import PageHeader from '@/components/v2/PageHeader'
import StepperSelect from '@/components/v2/StepperSelect'
import StandingsTable from '@/components/v2/StandingsTable'
import { dateRange } from '@/features/competitions/format'
import { V2NotFound } from '@/features/competitions/v2http'
import MonthCalendar from '@/features/calendar/MonthCalendar'
import ResultCard from '@/features/results/ResultCard'
import { shortDate } from '@/features/results/resultDraft'
import { useAuth } from '@/context/AuthContext'
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe'
import { useGroup, useGroupMatches } from './api'

type Tab = 'standings' | 'matches' | 'calendar'
const TABS: { key: Tab; label: string }[] = [
  { key: 'standings', label: 'Classificação' },
  { key: 'matches', label: 'Jogos' },
  { key: 'calendar', label: 'Calendário' },
]

export default function GroupPage() {
  const id = Number(useParams().id)
  const { data: g, isLoading, error } = useGroup(id)
  const { data: matches } = useGroupMatches(id)
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('standings')
  const [round, setRound] = useState<number | null>(null)

  const rounds = useMemo(() => {
    if (g?.rounds?.length) return g.rounds
    const nums = [...new Set((matches ?? []).map((m) => m.round))].sort((a, b) => a - b)
    return nums.map((n) => ({ id: n, number: n }))
  }, [g, matches])

  const activeRound = round ?? g?.currentRound ?? rounds[rounds.length - 1]?.number ?? null
  const roundMatches = (matches ?? []).filter((m) => m.round === activeRound)
  // Swiping the match list sideways steps the jornada (left = next, right = previous).
  const roundIdx = rounds.findIndex((r) => r.number === activeRound)
  const stepRound = (d: number) => {
    const r = rounds[roundIdx + d]
    if (r) setRound(r.number)
  }
  const swipe = useHorizontalSwipe({ onSwipeLeft: () => stepRound(1), onSwipeRight: () => stepRound(-1), enabled: rounds.length > 1 })

  if (isLoading) return <div className="loader" />
  if (error || !g) {
    return (
      <p className="text-center text-[15px] py-[40px]">
        {error instanceof V2NotFound ? 'Divisão não encontrada.' : 'Não foi possível carregar a divisão.'}{' '}
        <Link to="/tournaments" className="underline">Ver torneios</Link>
      </p>
    )
  }

  const c = g.competition
  return (
    <div className="l-grid">
      <PageHeader<Tab>
        image={g.bannerImage?.url ?? g.logoImage?.url}
        kicker={
          <Link to={`/competitions/${c.id}`} className="flex items-center gap-[8px] text-white" style={{ color: '#fff' }}>
            <FormatBadge competition={c} /> <span className="underline">{c.label}</span>
          </Link>
        }
        title={g.name}
        subtitle={[dateRange(c.startsOn, c.endsOn), g.hasEnded ? 'Terminada' : null].filter(Boolean).join(' · ')}
        tabs={TABS}
        active={tab}
        onTab={(k: Tab) => setTab(k)}
      />

      <div className="px-[16px] py-[16px] max-w-[900px] mx-auto w-full">
        {tab === 'standings' && (
          <>
            <StandingsTable rows={g.standings} format={c.format} />
            {g.standingsFrozen && <p className="text-[12px] text-gray-500 mt-[8px]">Classificação final.</p>}
          </>
        )}

        {tab === 'matches' && (
          <>
            {/* Jornada on the floating pill (same control as the Teams page); padding keeps the last card clear of it. */}
            <StepperSelect
              variant="pill"
              title="Jornada"
              value={activeRound}
              onChange={setRound}
              options={rounds.map((r) => ({
                key: r.number,
                label: `Jornada ${r.number}`,
                hint: shortDate((r as { date?: string | null }).date) ?? undefined,
                current: r.number === g.currentRound,
              }))}
            />
            <div className={`flex flex-col gap-[12px] ${rounds.length > 1 ? 'pb-[96px]' : ''}`} {...swipe}>
              {roundMatches.length === 0 && <p className="text-center text-[15px] text-gray-500">Sem jogos nesta jornada.</p>}
              {/* One card for viewing and editing (Pedro, 29 Oct): signed in, the games are typed in its
                  header and a player who did not come is tapped; visitors get the same card read-only.
                  An ended group is editable by admins only; a cancelled match by nobody. */}
              {roundMatches.map((m) => (
                <ResultCard
                  key={m.id}
                  match={m}
                  roundId={rounds.find((r) => r.number === m.round && r.id !== r.number)?.id}
                  roundDate={(rounds.find((r) => r.number === m.round) as { date?: string | null } | undefined)?.date}
                  roundMatches={roundMatches}
                  editable={!!user && m.status !== 'cancelled' && (!g.hasEnded || !!user.isAdmin || !!user.superAdmin)}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'calendar' && <MonthCalendar groupId={g.id} />}
      </div>
    </div>
  )
}
