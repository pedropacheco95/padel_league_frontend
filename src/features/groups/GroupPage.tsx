// Group (division) page: standings, matches per round, calendar.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import MatchCard from '@/components/v2/MatchCard'
import RoundSelector from '@/components/v2/RoundSelector'
import StandingsTable from '@/components/v2/StandingsTable'
import { formatDate } from '@/features/competitions/format'
import { V2NotFound } from '@/features/competitions/v2http'
import MonthCalendar from '@/features/calendar/MonthCalendar'
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
      <header className="c-tor-header c-tor-header--master">
        {g.logoImage?.url && (
          <div className="c-tor-header__poster">
            <div className="c-tor-header__img-container"><img src={g.logoImage.url} alt="" /></div>
          </div>
        )}
        <div className="flex flex-col items-center gap-[6px] py-[12px] px-[16px] text-center">
          <Link to={`/competitions/${c.id}`} className="flex items-center gap-[8px] text-[14px]" style={{ color: 'inherit' }}>
            <FormatBadge competition={c} /> <span className="underline">{c.name}</span>
          </Link>
          <h1 className="c-tor-header__title">{g.name}</h1>
          <p className="c-tor-header__iandt text-[14px]">
            De {formatDate(c.startsOn)} a {formatDate(c.endsOn)}
            {g.hasEnded ? ' · Terminada' : ''}
          </p>
        </div>
        <nav className="flex justify-center gap-[4px] border-b border-gray-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="px-[14px] py-[10px] text-[15px] font-semibold whitespace-nowrap"
              style={tab === t.key ? { borderBottom: '3px solid #006A71', color: '#006A71' } : { borderBottom: '3px solid transparent', color: '#6b7280' }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

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
              {roundMatches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </>
        )}

        {tab === 'calendar' && <MonthCalendar groupId={g.id} />}
      </div>
    </div>
  )
}
