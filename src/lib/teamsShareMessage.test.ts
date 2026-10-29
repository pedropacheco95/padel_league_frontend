import { describe, expect, it } from 'vitest'
import type { Match } from '@/api/v2'
import { buildTeamsShareMessage } from './teamsShareMessage'

const match = (scheduledAt: string | null): Match => ({
  id: 1, groupId: 1, competitionId: 27, format: 'teams', round: 3, scheduledAt, court: null, status: 'scheduled',
  participants: [], sets: [], homeScore: null, awayScore: null, winner: null, absences: [],
})
const header = (msg: string) => msg.split('\n')[0]

describe('buildTeamsShareMessage date', () => {
  it("uses the jornada's own date first, then the earliest scheduled match (the result card's rule)", () => {
    const divisions = [{ tier: 1, matches: [match('2026-11-10T21:30:00Z'), match(null)] }]
    expect(header(buildTeamsShareMessage('Teams', 1, 3, divisions, '2026-11-03'))).toContain('3ª Jornada - 03/11 às 21h30')
    expect(header(buildTeamsShareMessage('Teams', 1, 3, divisions, null))).toContain('3ª Jornada - 10/11 às 21h30')
    // nothing dated: the next-Tuesday guess, a Tuesday of some kind
    const guessed = /Jornada - (\d{2})\/(\d{2}) às/.exec(header(buildTeamsShareMessage('Teams', 1, 3, [{ tier: 1, matches: [match(null)] }])))!
    expect(new Date(new Date().getFullYear(), Number(guessed[2]) - 1, Number(guessed[1])).getDay()).toBe(2)
  })
})
