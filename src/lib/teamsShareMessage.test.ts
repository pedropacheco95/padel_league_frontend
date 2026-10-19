import { describe, expect, it } from 'vitest'
import type { Match, Participant } from '@/api/v2'
import { buildTeamsShareMessage, nextRoundToPlay, type TeamsDivisionRound } from './teamsShareMessage'

const player = (id: number) => ({ id, name: `P${id}` })

/** A Teams match: home pair `[a, b]`, away pair `[c, d]`; a null id is an unknown substitute. */
function match(
  id: number,
  round: number,
  home: [number, number],
  away: [number, number | null],
  extra: Partial<Match> = {},
): Match {
  const side = (s: 'home' | 'away', ids: (number | null)[]): Participant[] =>
    ids.map((pid, i) => ({
      side: s,
      slot: (i + 1) as 1 | 2,
      role: 'member' as const,
      player: pid == null ? null : player(pid),
    }))
  return {
    id,
    groupId: 1,
    round,
    status: 'scheduled',
    participants: [...side('home', home), ...side('away', away)],
    sets: [],
    ...extra,
  }
}

const division = (tier: number, matches: Match[]): TeamsDivisionRound => ({
  tier,
  name: `${tier}.ª Divisão`,
  round: matches[0]?.round ?? 1,
  matches,
})

describe('buildTeamsShareMessage', () => {
  it('lists each pair once, under a colour, division by division', () => {
    const first = division(1, [
      match(1, 3, [1, 2], [3, 4], { scheduledAt: '2026-10-20T21:30:00Z' }),
      match(2, 3, [5, 6], [7, 8]),
      // The same pairs meet again inside the round; they must not be repeated.
      match(3, 3, [1, 2], [5, 6]),
    ])
    const second = division(2, [match(4, 3, [9, 10], [11, 12])])

    expect(buildTeamsShareMessage('Teams 2026', [second, first])).toBe(
      [
        '🚨*Teams 2026 💥 | 3ª Jornada - 20/10 às 21h30 | PAC*🚨',
        '',
        '*1.ª Divisão*',
        '🟡 P1',
        '🟡 P2',
        '🔴 P3',
        '🔴 P4',
        '🟢 P5',
        '🟢 P6',
        '🔵 P7',
        '🔵 P8',
        '',
        '*2.ª Divisão*',
        '🟡 P9',
        '🟡 P10',
        '🔴 P11',
        '🔴 P12',
      ].join('\n'),
    )
  })

  it('keeps a known substitute and drops an unknown one', () => {
    const message = buildTeamsShareMessage('Teams 2026', [division(1, [match(1, 1, [1, 2], [3, null])])])
    expect(message).toContain('🔴 P3')
    expect(message.split('\n').filter(l => l.startsWith('🔴'))).toHaveLength(1)
  })

  it('leaves out a division with no match in the round', () => {
    const message = buildTeamsShareMessage('Teams 2026', [
      division(1, [match(1, 1, [1, 2], [3, 4])]),
      { tier: 2, name: '2.ª Divisão', round: 1, matches: [] },
    ])
    expect(message).not.toContain('2.ª Divisão')
  })

  it('names the division when it has no tier', () => {
    const message = buildTeamsShareMessage('Teams 2026', [
      { tier: null, name: 'Grupo A', round: 1, matches: [match(1, 1, [1, 2], [3, 4])] },
    ])
    expect(message).toContain('*Grupo A*')
  })
})

describe('nextRoundToPlay', () => {
  it('takes the lowest round that still has a match to play', () => {
    const matches = [
      match(1, 1, [1, 2], [3, 4], { status: 'played' }),
      match(2, 2, [1, 2], [5, 6]),
      match(3, 2, [3, 4], [7, 8]),
      match(4, 3, [1, 2], [7, 8]),
    ]
    expect(nextRoundToPlay(matches)).toEqual({ round: 2, matches: [matches[1], matches[2]] })
  })

  it('is null once everything has been played', () => {
    expect(nextRoundToPlay([match(1, 1, [1, 2], [3, 4], { status: 'played' })])).toBeNull()
  })
})
