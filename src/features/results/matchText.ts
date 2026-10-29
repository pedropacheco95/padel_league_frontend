import type { Match, Participant } from '@/api/v2'

export const participantName = (p: Participant) =>
  p.player?.name ?? (p.role === 'unknown' ? 'Substituto' : '—')

/** A seat as the card shows it: a substitute names who they stood in for ("Nuno (por Malafaya)"). */
export function seatLabel(p: Participant) {
  const name = participantName(p)
  return p.role !== 'member' && p.replaces ? `${name} (por ${p.replaces.name})` : name
}

const side = (m: Match, s: 'home' | 'away') =>
  m.participants.filter(p => p.side === s).sort((a, b) => a.slot - b.slot)

export const sideParticipants = (m: Match) => [side(m, 'home'), side(m, 'away')] as const

/** Absences to show on a match: the round's full ones, and a partial one only on the matches the player
 * misses (the API lists every absence of the round on each of its matches). */
export function matchAbsences(m: Match) {
  const playing = new Set(m.participants.map(p => p.player?.id).filter(Boolean))
  // A player whose seat already says "(por X)" needs no second mention.
  const shown = new Set(m.participants.map(p => p.replaces?.id).filter(Boolean))
  return (m.absences ?? []).filter(a => (a.kind !== 'partial' || !playing.has(a.player.id)) && !shown.has(a.player.id))
}

export const sideNames = (m: Match) =>
  sideParticipants(m).map(ps => ps.map(seatLabel).join(' & ')) as [string, string]

/** "6-3 · 4-6 · TE" for Teams, "5-4" otherwise; "6-3 · em curso" while saved set by set; null when unplayed. */
export function scoreText(m: Match): string | null {
  if (m.status === 'walkover') return `W.O. ${m.winner === 'home' ? 'casa' : 'fora'}`
  if (!m.sets.length) return null
  if (m.inProgress) return `${setsText(m)} · em curso`
  return setsText(m)
}

const setsText = (m: Match) =>
  m.sets
    .map(s => {
      if (s.outcome === 'not_started') return '—'
      const g = s.homeGames != null && s.awayGames != null ? `${s.homeGames}-${s.awayGames}` : ''
      return s.outcome === 'timeout_draw' ? `${g}${g ? ' ' : ''}TE` : g
    })
    .join(' · ')
