// Teams pair-formation projection and partner simulator (Pedro's "Divisões MT2 — projeção" and
// "Simulador de parceiro" boards). Shapes follow S2's GET /competitions/{id}/teams/projection and
// /teams/simulate; until they are in the generated schema they live here. The mock engine below runs
// the same seeding as build_divisions (mutual pairs as they are, everyone else paired in ranking order
// with the nearest allowed partner, pairs by sum of points, slices of 4) on the design's data.
import type { Schemas } from '@/api/v2'

export type RankedPlayer = Schemas['RankedPlayerRef']
export type ProjectedPair = Schemas['TeamsPairProjection']
export type ProjectedDivision = Schemas['TeamsDivisionProjection']
export type TeamsProjection = Schemas['TeamsProjection']
export type TeamsSimulation = Schemas['TeamsSimulation']
export type SimulationCandidate = TeamsSimulation['candidates'][number]
export type CandidateStatus = SimulationCandidate['status']

// ---- mock engine ----------------------------------------------------------------------------

const DESIGN: [string, number][] = [
  ['Malafaya', 5647], ['Joao perneta', 5503], ['Bernardo C', 4527], ['Pi Magalhaes', 4484], ['Pancho', 3596],
  ['Cuca', 2682], ['Talinho', 2340], ['Dinis', 2110], ['Afonso Martinho', 2061], ['Nuno Azevedo', 1960],
  ['Miguel Sá', 1890], ['Dudas', 1738], ['Rui Faria', 1702], ['Semelhe', 1621], ['Kikos', 1543],
  ['Álvaro Van Zeller', 1480], ['Zé Santos', 1390], ['Gonçalo Brito', 1350], ['Bernardo Vasconcelos', 1265],
  ['Tiago Mota', 1180], ['Freitas', 1110], ['Lopo Sottomayor', 1080], ['João Lello', 1012], ['Duarte Leal', 960],
  ['Henrique', 922], ['Zé Pedro Graça', 880], ['Vasco Pinto', 840], ['Fred Baptista', 787], ['Tomás Pacheco', 745],
  ['João Ribeiro', 712], ['Cou', 689], ['André Couto', 640], ['Martim Reis', 610], ['Bello', 565],
  ['Pedro Lemos', 520], ['Hugo Neves', 480], ['Salvador Melo', 455], ['Nathan', 427], ['Zema', 398],
  ['Rodrigo Paiva', 360], ['Francisco Aires', 330], ['Diogo Seabra', 290], ['Guilherme Cruz', 255],
  ['Simão Vaz', 210], ['Luís Magro', 170], ['La Serna', 120], ['Caetano Sousa', 80], ['Fipas', 0],
]
const PLAYERS: RankedPlayer[] = DESIGN.map(([name, rankingPoints], i) => ({
  id: 5000 + i, name, fullName: name, pictureUrl: null, rankingPoints, rankingPosition: i + 1,
}))
const byName = (n: string) => PLAYERS.find(p => p.name === n)!
const CONFIRMED: [string, string][] = [
  ['Malafaya', 'Cuca'], ['Joao perneta', 'Kikos'], ['Pi Magalhaes', 'Semelhe'], ['Bernardo C', 'Fipas'],
  ['Pancho', 'Henrique'], ['Talinho', 'Dinis'], ['Afonso Martinho', 'Dudas'], ['Nuno Azevedo', 'Álvaro Van Zeller'],
  ['Zé Santos', 'Freitas'], ['Miguel Sá', 'Nathan'], ['Rui Faria', 'Zema'], ['Gonçalo Brito', 'Martim Reis'],
  ['João Lello', 'Zé Pedro Graça'], ['Lopo Sottomayor', 'Bello'],
]
const DECLARED: [string, string][] = [['Cou', 'Tomás Pacheco'], ['Hugo Neves', 'Bernardo Vasconcelos']]
const PLAYED: [string, string, number[]][] = [['Tomás Pacheco', 'Fred Baptista', [1]]]

export const MOCK_ME = byName('Tomás Pacheco').id

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
const playedTogether = (a: number, b: number) =>
  PLAYED.find(([x, y]) => key(byName(x).id, byName(y).id) === key(a, b))?.[2] ?? []
const RATINGS = [500, 250, 125, 63, 31, 16]

function project(confirmed: [number, number][], mine?: number): ProjectedDivision[] {
  const inPair = new Set(confirmed.flat())
  const pairs: ProjectedPair[] = confirmed.map(([a, b]) => {
    const players = [a, b].map(id => PLAYERS.find(p => p.id === id)!)
    return { pairId: a, seed: 0, players, sum: players[0].rankingPoints + players[1].rankingPoints, formedBy: 'mutual', provisional: false, unpairedSlots: null, pending: [], mine: false }
  })
  const unpaired = PLAYERS.filter(p => !inPair.has(p.id)) // already in ranking order
  const slot = new Map(unpaired.map((p, i) => [p.id, i + 1]))
  const left = [...unpaired]
  while (left.length > 1) {
    const first = left.shift()!
    const i = Math.max(0, left.findIndex(p => playedTogether(first.id, p.id).length < 3))
    const [second] = left.splice(i, 1)
    pairs.push({ pairId: null, seed: 0, players: [first, second], sum: first.rankingPoints + second.rankingPoints, formedBy: 'ranking', provisional: true, pending: [], mine: false,
      unpairedSlots: [slot.get(first.id)!, slot.get(second.id)!] })
  }
  for (const pair of pairs) {
    const ids = pair.players.map(p => p.id)
    pair.pending = DECLARED.map(([f, t]) => ({ from: byName(f), to: byName(t) }))
      .filter(d => ids.includes(d.from.id) && !confirmed.some(c => c.includes(d.from.id) && c.includes(d.to.id)))
    if (mine !== undefined) pair.mine = ids.includes(mine)
  }
  const best = (p: ProjectedPair) => Math.max(...p.players.map(x => x.rankingPoints))
  pairs.sort((a, b) => b.sum - a.sum || best(b) - best(a))
  const divisions: ProjectedDivision[] = []
  for (let i = 0; i < pairs.length; i += 4) {
    const slice = pairs.slice(i, i + 4).map((p, k) => ({ ...p, seed: k + 1 }))
    const tier = i / 4 + 1
    const rating = RATINGS[tier - 1] ?? 8
    divisions.push({ tier, name: `Divisão ${tier}`, rating, maxPlacePoints: rating, maxBonusPoints: (rating / 100) * 9, pairs: slice,
      minSum: slice[slice.length - 1].sum, maxSum: slice[0].sum })
  }
  return divisions
}

const confirmedIds = (): [number, number][] => CONFIRMED.map(([a, b]) => [byName(a).id, byName(b).id])

export function mockProjection(): TeamsProjection {
  const divisions = project(confirmedIds())
  return {
    stage: { id: 2712, number: 2, pairingDeadline: '2026-10-18T22:59:00Z', pairingOpen: true, pairingClosed: false },
    counts: { players: PLAYERS.length, pairsTotal: PLAYERS.length / 2, pairsConfirmed: CONFIRMED.length,
      unpaired: PLAYERS.length - CONFIRMED.length * 2, pendingDeclarations: DECLARED.length },
    pending: DECLARED.map(([f, t]) => ({ from: byName(f), to: byName(t) })),
    divisions,
  }
}

function scenario(playerId: number, partnerId: number | null) {
  // Simulating breaks any confirmed pair either player is in; their former partners go back to the pool.
  const base = confirmedIds().filter(c => !c.includes(playerId) && (partnerId === null || !c.includes(partnerId)))
  const divisions = project(partnerId === null ? base : [...base, [playerId, partnerId]], playerId)
  const tier = divisions.find(d => d.pairs.some(p => p.mine))!
  const pair = tier.pairs.find(p => p.mine)!
  return { divisions, tier, pair, partner: pair.players.find(p => p.id !== playerId)! }
}

export function mockSimulation(playerId: number, partnerId: number | null): TeamsSimulation {
  const s = scenario(playerId, partnerId)
  const b = scenario(playerId, null)
  const above = s.divisions.find(d => d.tier === s.tier.tier - 1)
  const below = s.divisions.find(d => d.tier === s.tier.tier + 1)
  const confirmedWith = new Map(confirmedIds().flatMap(([a, c]) => [[a, c], [c, a]] as [number, number][]))
  const candidates = PLAYERS.filter(p => p.id !== playerId).map(p => {
    const c = scenario(playerId, p.id)
    const other = confirmedWith.get(p.id)
    const status: CandidateStatus = other !== undefined && other !== playerId ? 'confirmed'
      : DECLARED.some(([f, t]) => byName(f).id === p.id && byName(t).id === playerId) ? 'declaredYou'
      : DECLARED.some(([f, t]) => byName(f).id === playerId && byName(t).id === p.id) ? 'youDeclared' : 'free'
    const together = playedTogether(playerId, p.id)
    return { player: p, status, pairedWith: other !== undefined ? PLAYERS.find(x => x.id === other) : null,
      allowed: together.length < 3, reason: together.length < 3 ? null : 'Já jogaram 3 mini-torneios juntos.', sum: c.pair.sum, tier: c.tier.tier, seed: c.pair.seed, delta: b.tier.tier - c.tier.tier, playedTogether: together }
  })
  const player = PLAYERS.find(p => p.id === playerId)!
  return {
    ...mockProjection(),
    player,
    partner: partnerId === null ? null : PLAYERS.find(p => p.id === partnerId) ?? null,
    locked: false,
    divisions: s.divisions,
    result: { tier: s.tier.tier, seed: s.pair.seed, partner: s.partner, sum: s.pair.sum, rating: s.tier.rating,
      maxPlacePoints: s.tier.maxPlacePoints, maxBonusPoints: s.tier.maxBonusPoints,
      sumBreakdown: [player, s.partner].map(x => ({ player: x, points: x.rankingPoints })),
      gapUp: above ? above.minSum - s.pair.sum : null, marginDown: below ? s.pair.sum - below.maxSum : null,
      playedTogether: playedTogether(playerId, s.partner.id) },
    baseline: { tier: b.tier.tier, seed: b.pair.seed, partner: b.partner, sum: b.pair.sum },
    candidates: candidates.sort((x, y) => y.player.rankingPoints - x.player.rankingPoints),
  }
}
