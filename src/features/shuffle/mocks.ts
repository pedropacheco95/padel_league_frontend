// Shuffle fixtures for VITE_V2_MOCKS=true: one stage per round, six groups each (multipliers 10…3).
import type { Competition, Stage, StandingRow } from '@/api/v2'
import { mockPlayers } from '@/features/results/mocks'

let stages: Stage[] = []
const stage = (n: number): Stage => ({
  id: 2600 + n,
  number: n,
  name: null,
  status: 'running',
  groups: [1, 2, 3, 4, 5, 6].map(t => ({ id: 2600 + n * 10 + t, name: `Grupo ${t}`, tier: t })),
  rounds: [{ id: 26000 + n, number: n, date: null }],
})
stages = [1, 2].map(stage)

export const mockShuffle = {
  competition: (id: number): Competition => ({
    id,
    name: 'Shuffle (mock)',
    label: 'Shuffle (mock)',
    editionNumber: null,
    format: 'shuffle',
    formatLabel: 'Shuffle',
    season: { id: 3, name: '2026/27', isCurrent: true },
    status: 'live',
    groupCount: 6,
    rules: { division_multipliers: { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3 } },
    stages,
    currentStageId: stages[stages.length - 1]?.id ?? null,
  }),

  standings: (): StandingRow[] =>
    mockPlayers.map((player, i) => ({
      place: i + 1,
      player,
      points: 60 - i * 3,
      played: 6,
      wins: 4 - Math.floor(i / 5),
      draws: 1,
      losses: 1 + Math.floor(i / 5),
      gamesWon: 40 - i,
      gamesLost: 25 + i,
      nextGroupTier: Math.floor(i / 4) + 1,
    })),

  addRound: (id: number) => {
    stages = [...stages, stage(stages.length + 1)]
    return mockShuffle.competition(id)
  },

  deleteRound: (id: number) => {
    stages = stages.slice(0, -1)
    return mockShuffle.competition(id)
  },
}
