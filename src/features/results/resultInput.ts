// Pure rules for turning the result form into a v2 ResultInput (unit-tested).
// Clássica / Shuffle: one set carrying the games. Teams: up to 3 sets to 6 (tie-break at 6-6, so a
// completed set never ends level), saved set by set; a non-terminal score is a time-out (timeout_draw,
// typed games kept) and every later set not_started. Both count as a drawn set. A walkover has no sets.
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

const isBlank = (s: SetDraft | undefined) => (s?.home ?? '').trim() === '' && (s?.away ?? '').trim() === ''
/** Nothing typed for the set: blank, or 0-0 (a 0-0 is never a score; it is an untouched set). */
const isUntyped = (s: SetDraft | undefined) => isBlank(s) || (toNum(s?.home ?? '') === 0 && toNum(s?.away ?? '') === 0)

const badGames = (h: number | null, a: number | null) =>
  (h !== null && (!Number.isInteger(h) || h < 0)) || (a !== null && (!Number.isInteger(a) || a < 0))

/**
 * Teams (Pedro, 29 Oct 2026): the sets are typed in order; a terminal score (6-0…6-4, 7-5, 7-6) is a
 * completed set; a NON-terminal score (4-4, 3-2, 5-5…) means time ran out in that set: it is sent as
 * timeout_draw and every later set, which must be left untyped, as not_started. Terminal sets followed
 * by untyped ones are a partial save (the result stays in progress). A 0-0 counts as untyped.
 * timeoutAt: the set a SAVED result already marks as tempo esgotado (its games may be blank); it stays
 * a time-out unless the user types a terminal score into it.
 */
export function buildTeamsResult(sets: SetDraft[], timeoutAt: number | null): BuildResult {
  const out: ResultInput['sets'] = []
  let timedOut: number | null = null
  for (let i = 0; i < TEAMS_SETS; i++) {
    const h = toNum(sets[i]?.home ?? '')
    const a = toNum(sets[i]?.away ?? '')
    if (timedOut !== null) {
      if (!isUntyped(sets[i])) return { ok: false, error: `Set ${i + 1}: depois do tempo esgotado no set ${timedOut + 1} não há mais sets; deixa-o em branco.` }
      out.push({ homeGames: null, awayGames: null, outcome: 'not_started' })
      continue
    }
    const terminal = h !== null && a !== null && validTeamsSet(h, a)
    if (timeoutAt === i && !terminal) {
      if (badGames(h, a)) return { ok: false, error: `Set ${i + 1}: jogos inválidos.` }
      out.push({ homeGames: h, awayGames: a, outcome: 'timeout_draw' })
      timedOut = i
      continue
    }
    if (isUntyped(sets[i])) {
      if (i === 0) return { ok: false, error: 'Set 1: indica os jogos das duas equipas.' }
      if (sets.slice(i + 1, TEAMS_SETS).some(s => !isUntyped(s))) return { ok: false, error: `Set ${i + 1}: preenche os sets por ordem.` }
      break
    }
    if (h === null || a === null) return { ok: false, error: i === 0 ? 'Set 1: indica os jogos das duas equipas.' : `Set ${i + 1}: indica os jogos das duas equipas (ou deixa o set em branco para guardar mais tarde).` }
    if (badGames(h, a)) return { ok: false, error: `Set ${i + 1}: jogos inválidos.` }
    if (terminal) {
      out.push({ homeGames: h, awayGames: a, outcome: 'completed' })
      continue
    }
    // time ran out in this set: a drawn set, 1 point each; the rest of the match is not played
    out.push({ homeGames: h, awayGames: a, outcome: 'timeout_draw' })
    timedOut = i
  }
  return { ok: true, input: { sets: out } }
}

export function buildWalkover(winner: Side): ResultInput {
  return { sets: [], walkoverWinner: winner }
}

export function buildResult(format: Format | undefined, sets: SetDraft[], timeoutAt: number | null): BuildResult {
  return format === 'teams' ? buildTeamsResult(sets, timeoutAt) : buildGamesResult(sets[0] ?? { home: '', away: '' })
}

/** A Teams input that saves the match in progress (fewer than 3 sets, no walkover). */
export const isPartialInput = (input: ResultInput) => !input.walkoverWinner && input.sets.length > 0 && input.sets.length < TEAMS_SETS

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

/** The set being played when time ran out: the first one without a valid finished score. */
export function setInProgress(sets: SetDraft[]): number {
  const i = sets.slice(0, TEAMS_SETS).findIndex(s => {
    const h = toNum(s.home)
    const a = toNum(s.away)
    return h === null || a === null || !validTeamsSet(h, a)
  })
  return i === -1 ? TEAMS_SETS - 1 : i
}

/**
 * Teams walkover (Pedro's rule): whoever of the losing pair turned up keeps the presence, so the
 * no-shows must be recorded as absent for the round BEFORE the walkover result. `absent` is one
 * loser's player id, or 'both'. Players already marked absent are skipped.
 */
export function walkoverAbsentees(
  participants: { side: Side; role: string; player?: { id: number } | null }[],
  winner: Side,
  absent: number | 'both',
  alreadyAbsent: number[] = [],
): number[] {
  const losers = participants
    .filter(p => p.side !== winner && p.role === 'member' && p.player)
    .map(p => p.player!.id)
  const ids = absent === 'both' ? losers : losers.filter(id => id === absent)
  return ids.filter(id => !alreadyAbsent.includes(id))
}
