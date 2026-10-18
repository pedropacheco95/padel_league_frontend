// Teams fixtures for VITE_V2_MOCKS=true (competition 27, four mini-tournaments).
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { mockGroup, mockPlayers, useMocks } from '@/features/results/mocks'

export { useMocks }

const stages: Stage[] = [1, 2, 3, 4].map(n => ({
  id: 2710 + n,
  number: n,
  name: `Mini-torneio ${n}`,
  status: n === 1 ? 'running' : 'planned',
  emitsAward: true,
  pairingDeadline: n === 1 ? '2026-10-18T22:00:00Z' : null,
  pairingClosed: n === 1,
  groups: n === 1 ? [2701, 2702].map(id => {
    const { competition: _c, stage: _s, members: _m, standings: _st, rounds: _r, currentRound: _cr, ...summary } = mockGroup(id)
    return summary
  }) : [],
  rounds: n === 1 ? mockGroup(2701).rounds : [],
}))

export const mockTeams = {
  competition: (id: number): Competition => ({
    id,
    name: '23ª Edição',
    title: 'Teams 2026/27',
    label: '23ª Edição - Teams 2026/27',
    editionNumber: 23,
    format: 'teams',
    formatLabel: 'Teams',
    season: { id: 3, name: '2026/27', isCurrent: true },
    status: 'live',
    groupCount: 2,
    rules: {},
    stages,
    currentStageId: 2711,
  }),

  standings: (): StandingRow[] =>
    mockPlayers.map((player, i) => ({
      place: Math.floor(i / 2) + 1, // partners share the place
      player,
      points: 30 - Math.floor(i / 2) * 3,
      played: 3,
      setsWon: 6 - Math.floor(i / 4),
      setsDrawn: 1,
      stages: [{ stageNumber: 1, tier: 1, place: Math.floor(i / 2) + 1, points: 30 - Math.floor(i / 2) * 3 }],
    })),

  formDivisions: (stageId: number): Stage => stages.find(s => s.id === stageId) ?? stages[0],
}
