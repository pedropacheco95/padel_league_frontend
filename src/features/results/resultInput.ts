// Pure rules for turning the result form into a v2 ResultInput (unit-tested).
// Clássica / Shuffle: one set carrying the games. Teams: exactly 3 sets to 6 (tie-break at 6-6, so a
// completed set never ends level); "Tempo esgotado" makes the set in progress a timeout_draw (typed games
// kept) and every later set not_started. Both count as a drawn set. A walkover has no sets.
import type { Format, ResultInput } from '@/api/v2'

export interface SetDraft {
  home: string
  away: string
}

export type Side = 'home' | 'away'

export const TEAMS_SETS = 3

const toNum = (s: string) => (s.trim() === '' ? null : Number(s))

export function validTeamsSet(h: number, a: number): boolean {
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h === a) return false
  const [w, l] = h > a ? [h, a] : [a, h]
  return (w === 6 && l <= 4) || (w === 7 && (l === 5 || l === 6))
}

export type BuildResult = { ok: true; input: ResultInput } | { ok: false; error: string }

export function buildGamesResult(set: SetDraft): BuildResult {
  const h = toNum(set.home)
  const a = toNum(set.away)
  if (h === null || a === null) return { ok: false, error: 'Indica os jogos das duas equipas.' }
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return { ok: false, error: 'Os jogos têm de ser números inteiros.' }
  return { ok: true, input: { sets: [{ homeGames: h, awayGames: a, outcome: 'completed' }] } }
}

/**
 * timeoutAt: index of the set in progress when time ran out (null = all 3 sets played).
 * Sets before it must be complete; it becomes timeout_draw; later sets not_started.
 */
export function buildTeamsResult(sets: SetDraft[], timeoutAt: number | null): BuildResult {
  const out: ResultInput['sets'] = []
  for (let i = 0; i < TEAMS_SETS; i++) {
    const h = toNum(sets[i]?.home ?? '')
    const a = toNum(sets[i]?.away ?? '')
    if (timeoutAt !== null && i > timeoutAt) {
      out.push({ homeGames: null, awayGames: null, outcome: 'not_started' })
      continue
    }
    if (timeoutAt === i) {
      const bad = (h !== null && (!Number.isInteger(h) || h < 0)) || (a !== null && (!Number.isInteger(a) || a < 0))
      if (bad) return { ok: false, error: `Set ${i + 1}: jogos inválidos.` }
      out.push({ homeGames: h, awayGames: a, outcome: 'timeout_draw' })
      continue
    }
    if (h === null || a === null) return { ok: false, error: `Set ${i + 1}: indica os jogos (ou usa "Tempo esgotado").` }
    if (!validTeamsSet(h, a)) return { ok: false, error: `Set ${i + 1}: ${h}-${a} não é um resultado válido (6-0 a 6-4, 7-5 ou 7-6).` }
    out.push({ homeGames: h, awayGames: a, outcome: 'completed' })
  }
  return { ok: true, input: { sets: out } }
}

export function buildWalkover(winner: Side): ResultInput {
  return { sets: [], walkoverWinner: winner }
}

export function buildResult(format: Format | undefined, sets: SetDraft[], timeoutAt: number | null): BuildResult {
  return format === 'teams' ? buildTeamsResult(sets, timeoutAt) : buildGamesResult(sets[0] ?? { home: '', away: '' })
}

/** Set points for a Teams result as shown before saving: 3 per set won, 1 each per drawn set. */
export function teamsSetPoints(input: ResultInput): [number, number] {
  let h = 0
  let a = 0
  for (const s of input.sets) {
    if (s.outcome !== 'completed') { h += 1; a += 1 } else if ((s.homeGames ?? 0) > (s.awayGames ?? 0)) h += 3
    else a += 3
  }
  return [h, a]
}
