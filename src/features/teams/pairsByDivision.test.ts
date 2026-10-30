import { describe, expect, it } from 'vitest'
import { groupPairsByDivision, type DivisionGroup, type TeamsPair } from './pairsByDivision'

const player = (id: number) => ({ id, name: `P${id}`, fullName: `Player ${id}`, pictureUrl: null })
const pair = (id: number, a: number, b: number, rankingPoints: number): TeamsPair => ({
  id, source: 'mutual', players: [player(a), player(b)], rankingPoints,
})
const group = (id: number, name: string, tier: number | null, members: number[], pointsRange?: { min: number; max: number }): DivisionGroup => ({
  id, name, tier, members: members.map(player), pointsRange,
})

describe('groupPairsByDivision', () => {
  const groups = [
    group(139, '2.ª Divisão', 2, [5, 6, 7, 8]),
    group(138, '1.ª Divisão', 1, [1, 2, 3, 4], { min: 66, max: 545 }),
    group(140, '3.ª Divisão', 3, [9, 10]),
  ]
  const pairs = [pair(1, 5, 6, 300), pair(2, 1, 2, 900), pair(3, 7, 8, 350), pair(4, 3, 4, 800)]

  it('puts each pair in the division of its players, divisions in tier order, pairs by seed', () => {
    const { divisions, rest } = groupPairsByDivision(pairs, groups)
    expect(divisions.map(d => d.name)).toEqual(['1.ª Divisão', '2.ª Divisão']) // the 3.ª has no pair: left out
    expect(divisions[0].pairs.map(p => p.id)).toEqual([2, 4])
    expect(divisions.map(d => d.pointsRange)).toEqual([{ min: 66, max: 545 }, null]) // from the group, null when the API has none
    expect(divisions[1].pairs.map(p => p.id)).toEqual([3, 1]) // 350 before 300
    expect(rest).toEqual([])
  })

  it('keeps a pair whose players are in no group apart, never drops it', () => {
    const stray = pair(9, 50, 51, 100)
    const { divisions, rest } = groupPairsByDivision([...pairs, stray], groups)
    expect(divisions.flatMap(d => d.pairs).map(p => p.id).sort()).toEqual([1, 2, 3, 4])
    expect(rest).toEqual([stray])
  })

  it('with no groups everything is rest', () => {
    expect(groupPairsByDivision(pairs, [])).toEqual({ divisions: [], rest: pairs })
  })
})
