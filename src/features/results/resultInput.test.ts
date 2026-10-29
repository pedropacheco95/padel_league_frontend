import { describe, expect, it } from 'vitest'
import { buildGamesResult, buildTeamsResult, buildWalkover, isPartialInput, setInProgress, teamsSetPoints, validTeamsSet, walkoverAbsentees } from './resultInput'

const s = (home: string, away: string) => ({ home, away })

describe('validTeamsSet', () => {
  it.each([[6, 0], [6, 4], [4, 6], [7, 5], [7, 6], [6, 7]])('%i-%i is valid', (h, a) => expect(validTeamsSet(h, a)).toBe(true))
  it.each([[6, 6], [6, 5], [5, 3], [7, 4], [8, 6], [-1, 6]])('%i-%i is invalid', (h, a) => expect(validTeamsSet(h, a)).toBe(false))
})

describe('buildTeamsResult', () => {
  it('three completed sets → 3 completed sets, 3/0-style points', () => {
    const r = buildTeamsResult([s('6', '3'), s('4', '6'), s('7', '6')], null)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.input.sets.map(x => x.outcome)).toEqual(['completed', 'completed', 'completed'])
    expect(teamsSetPoints(r.input)).toEqual([6, 3])
  })

  it('timeout in set 2 → set 2 timeout_draw keeping games, set 3 not_started', () => {
    const r = buildTeamsResult([s('6', '2'), s('3', '2'), s('', '')], 1)
    expect(r.ok && r.input.sets).toEqual([
      { homeGames: 6, awayGames: 2, outcome: 'completed' },
      { homeGames: 3, awayGames: 2, outcome: 'timeout_draw' },
      { homeGames: null, awayGames: null, outcome: 'not_started' },
    ])
    if (r.ok) expect(teamsSetPoints(r.input)).toEqual([5, 2])
  })

  it('timeout before any set → 1/1 per set', () => {
    const r = buildTeamsResult([s('', ''), s('', ''), s('', '')], 0)
    expect(r.ok && r.input.sets.map(x => x.outcome)).toEqual(['timeout_draw', 'not_started', 'not_started'])
    if (r.ok) expect(teamsSetPoints(r.input)).toEqual([3, 3])
  })

  it('always sends exactly 3 sets', () => {
    for (const t of [null, 0, 1, 2]) {
      const r = buildTeamsResult([s('6', '0'), s('6', '0'), s('6', '0')], t)
      expect(r.ok && r.input.sets.length).toBe(3)
    }
  })

  it('rejects missing or impossible games', () => {
    expect(buildTeamsResult([s('6', '3'), s('', ''), s('6', '1')], null).ok).toBe(false)
    expect(buildTeamsResult([s('6', '6'), s('6', '3'), s('6', '1')], null).ok).toBe(false)
  })
})

describe('buildGamesResult / walkover', () => {
  it('one completed set with the games', () => {
    expect(buildGamesResult(s('5', '4'))).toEqual({ ok: true, input: { sets: [{ homeGames: 5, awayGames: 4, outcome: 'completed' }] } })
    expect(buildGamesResult(s('5', '')).ok).toBe(false)
  })
  it('walkover has no sets', () => {
    expect(buildWalkover('away')).toEqual({ sets: [], walkoverWinner: 'away' })
  })
})

describe('setInProgress', () => {
  it('is the first set without a valid finished score', () => {
    expect(setInProgress([s('6', '3'), s('3', '2'), s('', '')])).toBe(1)
    expect(setInProgress([s('', ''), s('', ''), s('', '')])).toBe(0)
    expect(setInProgress([s('6', '3'), s('6', '4'), s('2', '')])).toBe(2)
    expect(setInProgress([s('6', '3'), s('6', '4'), s('6', '0')])).toBe(2)
  })
})

describe('walkoverAbsentees', () => {
  const parts = [
    { side: 'home' as const, role: 'member', player: { id: 1 } },
    { side: 'home' as const, role: 'member', player: { id: 2 } },
    { side: 'away' as const, role: 'member', player: { id: 3 } },
    { side: 'away' as const, role: 'member', player: { id: 4 } },
  ]
  it('marks only the chosen no-show of the losing pair', () => {
    expect(walkoverAbsentees(parts, 'home', 4)).toEqual([4])
  })
  it('marks both losers when neither came, skipping ones already absent', () => {
    expect(walkoverAbsentees(parts, 'away', 'both')).toEqual([1, 2])
    expect(walkoverAbsentees(parts, 'away', 'both', [2])).toEqual([1])
  })
  it('never marks a winner', () => {
    expect(walkoverAbsentees(parts, 'home', 1)).toEqual([])
  })
})

describe('matchAbsences', () => {
  it('shows a partial absence only where the player is missing', async () => {
    const { matchAbsences } = await import('./matchText')
    const abs = (id: number, kind: 'full' | 'partial') => ({ id, roundId: 1, player: { id, name: `P${id}` }, kind, source: 'recorded' as const })
    const m = {
      id: 1, groupId: 1, round: 1, status: 'scheduled' as const, sets: [],
      participants: [{ side: 'home' as const, slot: 1 as const, role: 'member' as const, player: { id: 7, name: 'P7' } }],
      absences: [abs(7, 'partial'), abs(8, 'partial'), abs(9, 'full')],
    }
    expect(matchAbsences(m).map(a => a.player.id)).toEqual([8, 9])
  })
})

describe('buildTeamsResult set by set (Oct 2026)', () => {
  it('set 1 only → one completed set, saved in progress', () => {
    const r = buildTeamsResult([s('6', '3'), s('', ''), s('', '')], null)
    expect(r.ok && r.input.sets).toEqual([{ homeGames: 6, awayGames: 3, outcome: 'completed' }])
    expect(r.ok && isPartialInput(r.input)).toBe(true)
    expect(r.ok && teamsSetPoints(r.input)).toEqual([3, 0])
  })

  it('sets 1 and 2 → two completed sets, still in progress', () => {
    const r = buildTeamsResult([s('6', '3'), s('4', '6'), s('', '')], null)
    expect(r.ok && r.input.sets.length).toBe(2)
    expect(r.ok && isPartialInput(r.input)).toBe(true)
  })

  it('a typed set after a blank one is refused (fill in order)', () => {
    const r = buildTeamsResult([s('6', '3'), s('', ''), s('6', '4')], null)
    expect(r.ok).toBe(false)
    expect('error' in r && r.error).toMatch(/Set 2: preenche os sets por ordem/)
  })

  it('a half-typed set is still an error, set 1 blank is still an error', () => {
    expect(buildTeamsResult([s('6', '3'), s('4', ''), s('', '')], null).ok).toBe(false)
    expect(buildTeamsResult([s('', ''), s('', ''), s('', '')], null).ok).toBe(false)
  })

  it('three sets are complete, not partial; a time-out chain is never partial', () => {
    const full = buildTeamsResult([s('6', '3'), s('4', '6'), s('7', '6')], null)
    expect(full.ok && isPartialInput(full.input)).toBe(false)
    const te = buildTeamsResult([s('6', '2'), s('3', '2'), s('', '')], 1)
    expect(te.ok && te.input.sets.length).toBe(3)
    expect(te.ok && isPartialInput(te.input)).toBe(false)
  })
})
