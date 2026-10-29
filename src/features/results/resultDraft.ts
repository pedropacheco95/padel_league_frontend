// What the inline result card edits (pure, unit-tested): the typed sets, the time-out set and a
// walkover choice, and the same three read from the saved match, so the card knows when it is dirty.
import type { Match } from '@/api/v2'
import { TEAMS_SETS, type SetDraft, type Side } from './resultInput'

export interface Draft {
  sets: SetDraft[]
  /** index of the set in progress when time ran out (Teams), null = none */
  timeoutAt: number | null
  walkover: Side | null
}

export const setsFor = (match: Pick<Match, 'format'>) => (match.format === 'teams' ? TEAMS_SETS : 1)

export const emptySets = (n: number): SetDraft[] => Array.from({ length: n }, () => ({ home: '', away: '' }))

export function draftFrom(match: Pick<Match, 'sets'>, n: number): SetDraft[] {
  const sets = emptySets(n)
  for (const s of match.sets) {
    if (s.setNo >= 1 && s.setNo <= n) sets[s.setNo - 1] = { home: s.homeGames?.toString() ?? '', away: s.awayGames?.toString() ?? '' }
  }
  return sets
}

export function timeoutFrom(match: Pick<Match, 'sets'>): number | null {
  const i = match.sets.findIndex(s => s.outcome !== 'completed')
  return i >= 0 ? match.sets[i].setNo - 1 : null
}

export const walkoverFrom = (match: Pick<Match, 'status' | 'winner'>): Side | null =>
  match.status === 'walkover' && (match.winner === 'home' || match.winner === 'away') ? match.winner : null

/** The card's draft as the saved match would fill it. */
export function serverDraft(match: Pick<Match, 'format' | 'sets' | 'status' | 'winner'>): Draft {
  const teams = match.format === 'teams'
  return {
    sets: draftFrom(match, setsFor(match)),
    timeoutAt: teams ? timeoutFrom(match) : null,
    walkover: teams ? walkoverFrom(match) : null,
  }
}

const norm = (s: string) => s.trim()

export const sameDraft = (a: Draft, b: Draft) =>
  a.timeoutAt === b.timeoutAt &&
  a.walkover === b.walkover &&
  a.sets.length === b.sets.length &&
  a.sets.every((s, i) => norm(s.home) === norm(b.sets[i].home) && norm(s.away) === norm(b.sets[i].away))

/** "03/11/26" from the match's scheduledAt (Lisbon time); null when unscheduled. */
export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Lisbon' })
}

/** "MS" for Miguel SG: the avatar when the player has no photo (the serializer's default picture). */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Sets won so far (drawn sets count for nobody): the bar's SETS tally. */
export function setsTally(sets: { homeGames?: number | null; awayGames?: number | null; outcome: string }[]): [number, number] {
  let h = 0
  let a = 0
  for (const s of sets) {
    if (s.outcome !== 'completed') continue
    if ((s.homeGames ?? 0) > (s.awayGames ?? 0)) h++
    else if ((s.awayGames ?? 0) > (s.homeGames ?? 0)) a++
  }
  return [h, a]
}

/** The earliest scheduled time among a jornada's matches, as the WhatsApp message dates the night
 * (lib/teamsShareMessage dateLabel); null when none of them is scheduled. */
export function roundNight(matches: Pick<Match, 'scheduledAt'>[] | undefined): string | null {
  const times = (matches ?? []).map(m => (m.scheduledAt ? new Date(m.scheduledAt).getTime() : NaN)).filter(t => !Number.isNaN(t))
  return times.length ? new Date(Math.min(...times)).toISOString() : null
}
