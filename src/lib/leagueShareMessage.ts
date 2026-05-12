import type { Edition, Match, PlayerShort } from '@/types'

export interface LeagueMatchweekData {
  divisionId: number
  divisionNumber: number // for "*1.ª Divisão*"
  divisionName: string
  matchweekNumber: number // the next matchweek for this division
  matches: Match[] // the unplayed matches of that matchweek
}

const EMOJIS = ['🟡', '🔴', '🟢', '🔵'] as const

function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function nextTuesdayLabel(): string {
  const TUESDAY = 2
  const target = new Date()
  const daysUntilTuesday = (TUESDAY - target.getDay() + 7) % 7
  target.setDate(target.getDate() + daysUntilTuesday)
  return formatDayMonth(target)
}

function pickDateLabel(divisions: LeagueMatchweekData[]): string {
  let earliest: Date | null = null
  for (const div of divisions) {
    for (const match of div.matches) {
      if (!match.dateHour) continue
      const d = new Date(match.dateHour)
      if (isNaN(d.getTime())) continue
      if (!earliest || d < earliest) earliest = d
    }
  }
  return earliest ? formatDayMonth(earliest) : nextTuesdayLabel()
}

function pickMatchweekNumber(divisions: LeagueMatchweekData[]): number {
  if (divisions.length === 0) return 0
  // Most common; ties broken by smallest.
  const counts = new Map<number, number>()
  for (const d of divisions) {
    counts.set(d.matchweekNumber, (counts.get(d.matchweekNumber) ?? 0) + 1)
  }
  let bestCount = -1
  let bestNumber = Number.POSITIVE_INFINITY
  for (const [num, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && num < bestNumber)) {
      bestCount = count
      bestNumber = num
    }
  }
  return bestNumber
}

function headerLeagueName(edition: Edition): string {
  return edition.leagueName ?? edition.fullName ?? edition.name
}

export function buildLeagueShareMessage(
  edition: Edition,
  divisions: LeagueMatchweekData[],
): string {
  const visible = divisions
    .filter(d => d.matches.length > 0)
    .slice()
    .sort((a, b) => a.divisionNumber - b.divisionNumber)

  const dateLabel = pickDateLabel(visible)
  const matchweekNumber = pickMatchweekNumber(visible)
  const leagueName = headerLeagueName(edition)

  const lines: string[] = [
    `🚨*${leagueName} 💥 | ${matchweekNumber}ª Jornada - ${dateLabel} às 21h30 | PAC*🚨`,
    '',
  ]

  visible.forEach(division => {
    lines.push(`*${division.divisionNumber}.ª Divisão*`)

    // A matchweek's pairings are unique; the same team can appear in multiple
    // matches. Dedupe teams by the unordered pair of player IDs, preserving
    // the order they're first encountered across home/away of each match.
    const seen = new Map<string, [PlayerShort, PlayerShort]>()
    const teamKey = (team: [PlayerShort, PlayerShort]): string => {
      const ids = team
        .map(p => (p?.id ?? `name:${p?.name ?? ''}`))
        .map(String)
        .sort()
      return ids.join('-')
    }
    division.matches.forEach(match => {
      const teams: [PlayerShort, PlayerShort][] = [match.homePlayers, match.awayPlayers]
      teams.forEach(team => {
        const key = teamKey(team)
        if (!seen.has(key)) seen.set(key, team)
      })
    })

    let teamIdx = 0
    seen.forEach(team => {
      const emoji = EMOJIS[teamIdx % EMOJIS.length]
      team.forEach(player => {
        if (player?.name) lines.push(`${emoji} ${player.name}`)
      })
      teamIdx += 1
    })

    lines.push('')
  })

  return lines.join('\n').trim()
}
