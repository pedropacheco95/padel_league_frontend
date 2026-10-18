import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Fingerprint, HERO_STYLE, NightsGrid, h, type StoryRing } from './art'

const rings: StoryRing[] = [
  { competitionId: 7, edition: '5ª', format: 'classica', tier: 2, place: 3, title: false, matches: [[3, 101], [-2, 102], [0, 103], [5, 104]] },
  { competitionId: 8, edition: '6ª', format: 'classica', tier: 1, place: 1, title: true, matches: [[1, 201], [2, 202], [-4, 203]] },
]

describe('player story art', () => {
  it('hash is a pure function of (player, match)', () => {
    expect(h(27, 1537)).toBe(h(27, 1537))
    expect(h(27, 1537)).not.toBe(h(28, 1537))
    expect(h(27, 1537)).toBeGreaterThanOrEqual(0)
    expect(h(27, 1537)).toBeLessThan(1)
  })

  it('the same rings always draw the same fingerprint', () => {
    const a = renderToStaticMarkup(<Fingerprint seed={27} rings={rings} style={HERO_STYLE} size={358} next="23ª Teams" labels />)
    const b = renderToStaticMarkup(<Fingerprint seed={27} rings={rings} style={HERO_STYLE} size={358} next="23ª Teams" labels />)
    expect(a).toBe(b)
    expect(a).toContain('stroke-dasharray="4 3"') // 2ª divisão ring
    expect(a).toContain('23ª Teams →')
    expect(renderToStaticMarkup(<Fingerprint seed={28} rings={rings} style={HERO_STYLE} size={358} />)).not.toBe(a)
  })

  it('nights grid marks absences and the best night', () => {
    const svg = renderToStaticMarkup(
      <NightsGrid
        data={{
          title: { key: 'k', text: 't' },
          lede: { key: 'k', text: 't' },
          played: 1,
          missed: 1,
          cells: [
            { date: '2025-04-29', net: 18, played: true, estimated: false, competitionId: 20, round: 2 },
            { date: '2025-05-06', net: null, played: false, estimated: false, competitionId: 20, round: 3 },
          ],
          best: { date: '2025-04-29', net: 18, label: 'x', scores: [], line: { key: 'k', text: 't' } },
        }}
      />,
    )
    expect(svg).toContain('#FF6B6B') // falta outline
    expect(svg).toContain('stroke-width="1.4"') // best night outline
  })
})
