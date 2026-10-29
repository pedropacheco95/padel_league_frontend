import { describe, expect, it } from 'vitest'
import type { Match } from '@/api/v2'
import { draftFrom, initials, sameDraft, serverDraft, setsTally, shortDate, timeoutFrom, walkoverFrom } from './resultDraft'

const teams = (over: Partial<Match> = {}): Pick<Match, 'format' | 'sets' | 'status' | 'winner'> => ({
  format: 'teams',
  status: 'scheduled',
  winner: null,
  sets: [],
  ...over,
})

describe('result card draft (Oct 2026 inline card)', () => {
  it('fills the typed sets from the saved match and pads the rest', () => {
    expect(draftFrom({ sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }] }, 3)).toEqual([
      { home: '6', away: '3' },
      { home: '', away: '' },
      { home: '', away: '' },
    ])
  })

  it('reads the time-out set and the walkover side', () => {
    expect(timeoutFrom({ sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }, { setNo: 2, homeGames: 3, awayGames: 2, outcome: 'timeout_draw' }] })).toBe(1)
    expect(timeoutFrom({ sets: [] })).toBeNull()
    expect(walkoverFrom({ status: 'walkover', winner: 'away' })).toBe('away')
    expect(walkoverFrom({ status: 'played', winner: 'away' })).toBeNull()
  })

  it('is dirty only when the typed games differ from the saved ones (spaces ignored)', () => {
    const saved = serverDraft(teams({ sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }], inProgress: true }))
    expect(sameDraft(saved, { ...saved, sets: [{ home: ' 6', away: '3 ' }, ...saved.sets.slice(1)] })).toBe(true)
    expect(sameDraft(saved, { ...saved, sets: [saved.sets[0], { home: '4', away: '6' }, saved.sets[2]] })).toBe(false)
    expect(sameDraft(saved, { ...saved, walkover: 'home' })).toBe(false)
    expect(sameDraft(saved, { ...saved, timeoutAt: 0 })).toBe(false)
  })

  it('Clássica has one pair of games and no Teams extras', () => {
    expect(serverDraft({ format: 'classica', status: 'walkover', winner: 'home', sets: [] })).toEqual({ sets: [{ home: '', away: '' }], timeoutAt: null, walkover: null })
  })

  it('shows the day as dd/mm/yy in Lisbon time', () => {
    expect(shortDate('2026-11-03T21:30:00Z')).toBe('03/11/26')
    expect(shortDate(null)).toBeNull()
    expect(shortDate('nope')).toBeNull()
  })

  it('initials for the photo-less avatar, and the sets tally of the bar', () => {
    expect(initials('Miguel SG')).toBe('MS')
    expect(initials('Pi Magalhaes')).toBe('PM')
    expect(initials('Dudas')).toBe('DU')
    expect(initials('')).toBe('?')
    expect(setsTally([{ homeGames: 6, awayGames: 4, outcome: 'completed' }, { homeGames: 3, awayGames: 6, outcome: 'completed' }, { homeGames: 7, awayGames: 5, outcome: 'completed' }])).toEqual([2, 1])
    expect(setsTally([{ homeGames: 6, awayGames: 4, outcome: 'completed' }, { homeGames: 3, awayGames: 3, outcome: 'timeout_draw' }, { homeGames: null, awayGames: null, outcome: 'not_started' }])).toEqual([1, 0])
  })
})
