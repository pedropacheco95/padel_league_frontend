import type { ShuffleTournamentDetail } from '@/types/tournament'

export function buildShuffleShareMessage(tournament: ShuffleTournamentDetail): string {
  const emojis = ['🟡', '🔴', '🟢', '🔵']
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const dateLabel = `${day}/${month}`

  const lines: string[] = [
    `🚨*${tournament.title} 💥 | ${tournament.currentMatchweek}ª Jornada - ${dateLabel} às 21h30 | PAC*🚨`,
    '',
  ]

  const playersById = new Map(tournament.players.map(p => [p.id, p]))

  tournament.divisions
    .sort((a, b) => a.number - b.number)
    .forEach(division => {
      lines.push(`*${division.number}.ª Divisão*`)
      const ids = division.playerIds.slice(0, 8)
      const pairs: [string | undefined, string | undefined][] = [
        [ids[0], ids[7]],
        [ids[1], ids[6]],
        [ids[2], ids[5]],
        [ids[3], ids[4]],
      ]

      pairs.forEach((pair, pairIdx) => {
        const emoji = emojis[pairIdx % emojis.length]
        pair.forEach(playerId => {
          if (!playerId) return
          const name = playersById.get(playerId)?.name
          if (name) lines.push(`${emoji} ${name}`)
        })
      })

      lines.push('')
    })

  return lines.join('\n').trim()
}
