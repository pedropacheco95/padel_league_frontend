import { describe, expect, it } from 'vitest'
import { buildGamesResult, buildTeamsResult, buildWalkover, setInProgress, teamsSetPoints, validTeamsSet } from './resultInput'

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
