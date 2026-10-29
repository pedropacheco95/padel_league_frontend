import { describe, expect, it } from 'vitest'
import { groupByTheme } from './Badges'

const themes = [
  { key: 'volume', label: 'Volume' },
  { key: 'teams', label: 'Teams' },
  { key: 'estreia', label: 'Estreia' },
]
const badge = (key: string, theme: string, rarityPct: number) =>
  ({ key, theme, rarityPct, name: key, rule: '', kind: 'at_least', themeLabel: theme, holdersCount: 0, tier: 'comum', tierLabel: 'Comum',
    rarityLine: { key: 'r', text: '' }, holders: [] }) as unknown as Parameters<typeof groupByTheme>[1][number]

describe('conquistas catalogue grouping', () => {
  it('keeps the API theme order and the rarest-first order inside each theme', () => {
    const badges = [badge('estreia_vitoriosa', 'estreia', 58.6), badge('clube_400', 'volume', 3.4), badge('clube_100', 'volume', 49.4)]
    const groups = groupByTheme(themes, badges)
    expect(groups.map((g) => g.key)).toEqual(['volume', 'estreia'])
    expect(groups[0].badges.map((b) => b.key)).toEqual(['clube_400', 'clube_100'])
  })

  it('leaves out a theme with no badge and never drops a badge', () => {
    const badges = [badge('a', 'teams', 1), badge('b', 'volume', 2)]
    const groups = groupByTheme(themes, badges)
    expect(groups.map((g) => g.label)).toEqual(['Volume', 'Teams'])
    expect(groups.flatMap((g) => g.badges).length).toBe(badges.length)
  })
})
