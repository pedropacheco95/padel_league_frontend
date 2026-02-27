import { api } from './client'
import { USE_MOCK, mockResponse, mockTournamentDetails } from '@/data/mockData'

export interface CalendarEvent {
  id: number
  title: string
  divisionId: number | null
  divisionName: string | null
  dateHour: string | null
  played: boolean
  gamesHomeTeam: number | null
  gamesAwayTeam: number | null
  href: string
}

export interface CalendarMonthData {
  month: string
  startsOn: string
  endsBefore: string
  divisionId: number | null
  events: CalendarEvent[]
}

function buildMockCalendarMonth(month: string, divisionId?: number): CalendarMonthData {
  const [year, m] = month.split('-').map(Number)
  const startsOn = `${month}-01`
  const nextMonth = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`
  const endsBefore = `${nextMonth}-01`

  const details = Object.values(mockTournamentDetails)
  const allMatches = details.flatMap(d => d.allMatches)
    .filter(match => !divisionId || match.divisionId === divisionId)
    .filter(match => {
      if (!match.dateHour) return false
      const date = new Date(match.dateHour)
      return date.getFullYear() === year && date.getMonth() + 1 === m
    })

  const events: CalendarEvent[] = allMatches.map(match => ({
    id: match.id,
    title: `${match.homePlayers.map(p => p.name).join(' / ')} vs ${match.awayPlayers.map(p => p.name).join(' / ')}`,
    divisionId: match.divisionId,
    divisionName: details.find(d => d.division.id === match.divisionId)?.division.name ?? null,
    dateHour: match.dateHour,
    played: match.played,
    gamesHomeTeam: match.gamesHomeTeam,
    gamesAwayTeam: match.gamesAwayTeam,
    href: `/matches/${match.id}`,
  }))

  return {
    month,
    startsOn,
    endsBefore,
    divisionId: divisionId ?? null,
    events,
  }
}

export const calendarApi = {
  month: (month: string, divisionId?: number) => {
    if (USE_MOCK) {
      return mockResponse(buildMockCalendarMonth(month, divisionId))
    }

    const base = divisionId ? `/calendar/${divisionId}` : '/calendar'
    return api.get<CalendarMonthData>(`${base}?month=${month}`)
  },
}
