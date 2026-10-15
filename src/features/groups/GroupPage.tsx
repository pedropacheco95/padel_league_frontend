// Group (division) page: standings, matches per round, calendar.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import PageHeader from '@/components/v2/PageHeader'
import MatchCard from '@/components/v2/MatchCard'
import RoundSelector from '@/components/v2/RoundSelector'
import StandingsTable from '@/components/v2/StandingsTable'
import { dateRange } from '@/features/competitions/format'
import { V2NotFound } from '@/features/competitions/v2http'
import MonthCalendar from '@/features/calendar/MonthCalendar'
import { useGroup, useGroupMatches } from './api'
import MatchActionsSlot from './MatchActionsSlot'

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
  const [tab, setTab] = useState<Tab>('standings')
  const [round, setRound] = useState<number | null>(null)

  const rounds = useMemo(() => {
    if (g?.rounds?.length) return g.rounds
    const nums = [...new Set((matches ?? []).map((m) => m.round))].sort((a, b) => a - b)
    return nums.map((n) => ({ id: n, number: n }))
  }, [g, matches])

  const activeRound = round ?? g?.currentRound ?? rounds[rounds.length - 1]?.number ?? null
  const roundMatches = (matches ?? []).filter((m) => m.round === activeRound)

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
            <FormatBadge competition={c} /> <span className="underline">{c.name}</span>
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
            <RoundSelector rounds={rounds} value={activeRound} onChange={setRound} />
            <div className="flex flex-col gap-[12px]">
              {roundMatches.length === 0 && <p className="text-center text-[15px] text-gray-500">Sem jogos nesta jornada.</p>}
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  actions={c.format === 'teams' || c.format === 'shuffle' ? undefined : (
                    <MatchActionsSlot match={m} roundId={rounds.find((r) => r.number === m.round && r.id !== r.number)?.id} />
                  )}
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
