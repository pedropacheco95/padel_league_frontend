// Parelhas organised by division (Pedro, 30 Oct): once the mini-tournament's divisions exist, the formed
// pairs are listed under their division; while pairs are still forming, the list stays flat.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PairChoice from './PairChoice'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
const pair = (id: number, a: ReturnType<typeof player>, b: ReturnType<typeof player>, rankingPoints: number) => ({
  id, source: 'mutual', players: [a, b], rankingPoints,
})
const [cou, dinis, pancho, archer] = [player(1, 'Cou'), player(2, 'Dinis'), player(3, 'Pancho'), player(4, 'Archer')]
const state = (pairingClosed: boolean) => ({
  miniTournament: { id: 34, number: 1, pairingDeadline: null, pairingClosed, pairingOpen: false },
  players: [cou, dinis, pancho, archer].map(p => ({ ...p, rankingPoints: 0, rankingPosition: null, paired: true, allowedForMe: false })),
  pairs: [pair(1, pancho, archer, 300), pair(2, cou, dinis, 900)],
  me: { playerId: null, inRoster: false, myChoice: null, choseMe: [], pairId: null, isAdmin: false },
})
const competition = (withGroups: boolean) => ({
  id: 27, stages: [{ id: 34, number: 1, status: 'running', groups: withGroups ? [{ id: 138, name: '1.ª Divisão', tier: 1 }, { id: 139, name: '2.ª Divisão', tier: 2 }] : [], rounds: [] }],
  currentStageId: 34,
})
vi.mock('./api', () => ({
  teamsApi: { state: vi.fn(async () => ({ data: mocked.state })) },
  teamsV2Api: { competition: vi.fn(async () => mocked.competition) },
}))
vi.mock('@/features/results/api', () => ({
  errorMessage: () => 'erro',
  resultsApi: {
    group: vi.fn(async (id: number) => ({ id, name: id === 138 ? '1.ª Divisão' : '2.ª Divisão', tier: id === 138 ? 1 : 2, members: id === 138 ? [cou, dinis] : [pancho, archer] })),
    players: vi.fn(async () => []),
  },
}))
const mocked = { state: state(true), competition: competition(true) as unknown }

const renderTab = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><PairChoice competitionId={27} /></MemoryRouter>
    </QueryClientProvider>,
  )

describe('Parelhas by division', () => {
  it('lists each pair under its division, divisions in order', async () => {
    mocked.state = state(true)
    mocked.competition = competition(true)
    renderTab()
    const first = await screen.findByRole('region', { name: /1\.ª Divisão/ })
    const second = screen.getByRole('region', { name: /2\.ª Divisão/ })
    expect(within(first).getByText('Cou & Dinis')).toBeInTheDocument()
    expect(within(first).queryByText('Pancho & Archer')).toBeNull()
    expect(within(second).getByText('Pancho & Archer')).toBeInTheDocument()
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Parelhas formadas (2/2)')).toBeInTheDocument()
  })

  it('keeps the flat list while the divisions are not formed', async () => {
    mocked.state = state(false)
    mocked.competition = competition(false)
    renderTab()
    expect(await screen.findByText('Cou & Dinis')).toBeInTheDocument()
    expect(screen.getByText('Pancho & Archer')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Divisão/ })).toBeNull()
  })
})
