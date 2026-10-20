import type { Match, PlayerRef } from '@/api/v2'

export interface TeamsDivisionRound {
  tier: number // for "*1.ª Divisão*"
  matches: Match[] // that division's matches in the round
}

const EMOJIS = ['🟡', '🔴', '🟢', '🔵'] as const

const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Earliest scheduled match, else today if it's Tuesday, else the next Tuesday.
function dateLabel(divisions: TeamsDivisionRound[]): string {
  const times = divisions
    .flatMap(d => d.matches.map(m => (m.scheduledAt ? new Date(m.scheduledAt).getTime() : NaN)))
    .filter(t => !isNaN(t))
  if (times.length) return dayMonth(new Date(Math.min(...times)))
  const target = new Date()
  target.setDate(target.getDate() + ((2 - target.getDay() + 7) % 7))
  return dayMonth(target)
}

/** Same layout as the Clássica and Shuffle messages: one emoji per pair, both partners under it. */
export function buildTeamsShareMessage(
  title: string,
  stageNumber: number,
  jornada: number,
  divisions: TeamsDivisionRound[],
): string {
  const lines = [`🚨*${title} 💥 | Mini-torneio ${stageNumber} · ${jornada}ª Jornada - ${dateLabel(divisions)} às 21h30 | PAC*🚨`, '']
  divisions
    .filter(d => d.matches.length > 0)
    .sort((a, b) => a.tier - b.tier)
    .forEach(d => {
      lines.push(`*${d.tier}.ª Divisão*`)
      // Pairs in the order they first appear in the round's matches.
      const pairs = new Map<string, PlayerRef[]>()
      d.matches.forEach(m =>
        (['home', 'away'] as const).forEach(side => {
          const players = m.participants
            .filter(p => p.side === side && p.player)
            .sort((a, b) => a.slot - b.slot)
            .map(p => p.player!)
          const key = players.map(p => p.id).sort((a, b) => a - b).join('-')
          if (players.length && !pairs.has(key)) pairs.set(key, players)
        }),
      )
      ;[...pairs.values()].forEach((pair, i) => pair.forEach(p => lines.push(`${EMOJIS[i % EMOJIS.length]} ${p.name}`)))
      lines.push('')
    })
  return lines.join('\n').trim()
}
