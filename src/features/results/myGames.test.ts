import { describe, expect, it } from 'vitest'
import type { Competition, GroupDetail } from '@/api/v2'
import { currentRoundDate, currentStage, landingPath, pickTarget } from './myGames'

const card = (id: number, format: string) => ({ id, format, label: `${id}`, name: `${id}`, status: 'live' }) as never
const group = (id: number, currentRound: number | null, date: string | null): GroupDetail =>
  ({ id, name: `${id}`, members: [], standings: [], currentRound, rounds: [{ id: 1, number: 1, date: null }, { id: 2, number: 2, date }] }) as unknown as GroupDetail

describe('myGames', () => {
  it('currentStage: the current stage id, else the running one, else the first not ended', () => {
    const stages = [
      { id: 1, number: 1, status: 'ended', groups: [], rounds: [] },
      { id: 2, number: 2, status: 'running', groups: [], rounds: [] },
      { id: 3, number: 3, status: 'planned', groups: [], rounds: [] },
    ]
    expect(currentStage({ stages, currentStageId: 3 } as unknown as Competition)?.id).toBe(3)
    expect(currentStage({ stages, currentStageId: null } as unknown as Competition)?.id).toBe(2)
    expect(currentStage({ stages: [stages[0], stages[2]] } as unknown as Competition)?.id).toBe(3)
    expect(currentStage({ stages: [] } as unknown as Competition)).toBeUndefined()
  })

  it('landingPath: Clássica → the group page Jogos tab; Teams/Shuffle → the competition page Jogos section', () => {
    expect(landingPath({ competition: { id: 25, format: 'classica' }, group: { id: 72 } })).toBe('/groups/72?tab=matches')
    expect(landingPath({ competition: { id: 27, format: 'teams' }, group: { id: 138 } })).toBe('/competitions/27?section=matches&group=138')
  })

  it('currentRoundDate: the date of the current round, null without one', () => {
    expect(currentRoundDate(group(1, 2, '2026-10-27'))).toBe('2026-10-27')
    expect(currentRoundDate(group(1, null, '2026-10-27'))).toBeNull()
  })

  it('pickTarget: the competition whose current jornada is nearest today', () => {
    const today = new Date('2026-10-28')
    const teams = { competition: card(27, 'teams'), group: group(138, 2, '2026-10-27') }
    const classica = { competition: card(28, 'classica'), group: group(80, 2, '2026-11-10') }
    expect(pickTarget([classica, teams], today)).toBe(teams)
    expect(pickTarget([teams, classica], today)).toBe(teams)
  })

  it('pickTarget: without dates the Clássica wins, then the newest competition', () => {
    const teams = { competition: card(27, 'teams'), group: group(138, null, null) }
    const classica = { competition: card(28, 'classica'), group: group(80, null, null) }
    const shuffle = { competition: card(30, 'shuffle'), group: group(90, null, null) }
    expect(pickTarget([teams, classica, shuffle])).toBe(classica)
    expect(pickTarget([teams, shuffle])).toBe(shuffle)
    expect(pickTarget([])).toBeNull()
  })
})
