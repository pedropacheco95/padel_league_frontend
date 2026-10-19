import type { Match, PlayerRef } from '@/api/v2'

// The call sheet the group gets on WhatsApp, for a Teams mini-tournament — the
// same shape Shuffle (shuffleShareMessage.ts) and Clássica (leagueShareMessage.ts)
// already produce, so the three read identically in the chat. Kept as its own
// builder for the same reason those are: each format reaches its pairs
// differently, and only the text they end up with is shared.
//
// Teams pairs are fixed for the mini-tournament, but the API exposes them per
// match rather than as a list, so they are read back off the round's matches.

const EMOJIS = ['🟡', '🔴', '🟢', '🔵'] as const

export interface TeamsDivisionRound {
  /** Division number for "*1.ª Divisão*"; falls back to the group's name when a group has no tier. */
  tier: number | null
  name: string
  round: number
  /** The matches of that round, in any order. */
  matches: Match[]
}

function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

/** Matchweeks are on Tuesdays: today if today is Tuesday, else the next one. */
function nextTuesdayLabel(): string {
  const TUESDAY = 2
  const target = new Date()
  target.setDate(target.getDate() + ((TUESDAY - target.getDay() + 7) % 7))
  return formatDayMonth(target)
}

/** The earliest scheduled match of the round, which is the day it is played on. */
function dateLabel(divisions: TeamsDivisionRound[]): string {
  let earliest: Date | null = null
  for (const division of divisions) {
    for (const match of division.matches) {
      if (!match.scheduledAt) continue
      const at = new Date(match.scheduledAt)
      if (isNaN(at.getTime())) continue
      if (!earliest || at < earliest) earliest = at
    }
  }
  return earliest ? formatDayMonth(earliest) : nextTuesdayLabel()
}

/** The round number the message is for: the one most divisions are playing, ties to the lowest. */
function roundNumber(divisions: TeamsDivisionRound[]): number {
  const counts = new Map<number, number>()
  for (const division of divisions) counts.set(division.round, (counts.get(division.round) ?? 0) + 1)
  let best = 0
  let bestCount = -1
  for (const [round, count] of counts) {
    if (count > bestCount || (count === bestCount && round < best)) {
      best = round
      bestCount = count
    }
  }
  return best
}

/**
 * The round's pairs, in the order they are first met.
 *
 * A pair plays several matches in a round, so the same two players come back
 * more than once; they are deduped on the pair of player ids. A substitute is
 * announced under the member they stand in for, so pairs are keyed on who is
 * listed, substitute included — an unknown substitute (no player) is skipped.
 */
function pairsOf(matches: Match[]): PlayerRef[][] {
  const seen = new Map<string, PlayerRef[]>()
  const ordered = [...matches].sort((a, b) => a.id - b.id)
  for (const match of ordered) {
    for (const side of ['home', 'away'] as const) {
      const players = match.participants
        .filter(p => p.side === side)
        .sort((a, b) => a.slot - b.slot)
        .map(p => p.player)
        .filter((p): p is PlayerRef => !!p)
      if (players.length === 0) continue
      const key = players
        .map(p => p.id)
        .sort((a, b) => a - b)
        .join('-')
      if (!seen.has(key)) seen.set(key, players)
    }
  }
  return [...seen.values()]
}

/**
 * `title` is the competition's own name, as it is written in the chat.
 * Divisions with no match in the round are left out — an empty one would
 * otherwise print a heading with nobody under it.
 */
export function buildTeamsShareMessage(title: string, divisions: TeamsDivisionRound[]): string {
  const visible = divisions
    .filter(division => division.matches.length > 0)
    .slice()
    .sort((a, b) => (a.tier ?? Number.MAX_SAFE_INTEGER) - (b.tier ?? Number.MAX_SAFE_INTEGER))

  const lines: string[] = [
    `🚨*${title} 💥 | ${roundNumber(visible)}ª Jornada - ${dateLabel(visible)} às 21h30 | PAC*🚨`,
    '',
  ]

  for (const division of visible) {
    lines.push(`*${division.tier != null ? `${division.tier}.ª Divisão` : division.name}*`)
    pairsOf(division.matches).forEach((pair, index) => {
      const emoji = EMOJIS[index % EMOJIS.length]
      for (const player of pair) lines.push(`${emoji} ${player.name}`)
    })
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * The round a call sheet is for: the lowest one that still has a match to play.
 * Returns null once every match of the division has been played.
 */
export function nextRoundToPlay(matches: Match[]): { round: number; matches: Match[] } | null {
  const pending = matches.filter(m => m.status === 'scheduled').map(m => m.round)
  if (pending.length === 0) return null
  const round = Math.min(...pending)
  return { round, matches: matches.filter(m => m.round === round) }
}
