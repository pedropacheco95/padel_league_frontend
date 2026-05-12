import type { Edition, Match } from '@/types'

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
    division.matches.forEach((match, matchIdx) => {
      const homeEmoji = EMOJIS[(2 * matchIdx) % EMOJIS.length]
      const awayEmoji = EMOJIS[(2 * matchIdx + 1) % EMOJIS.length]
      match.homePlayers.forEach(player => {
        if (player?.name) lines.push(`${homeEmoji} ${player.name}`)
      })
      match.awayPlayers.forEach(player => {
        if (player?.name) lines.push(`${awayEmoji} ${player.name}`)
      })
    })
    lines.push('')
  })

  return lines.join('\n').trim()
}
