// Parelhas organised by division (Pedro, 30 Oct): once the mini-tournament's divisions exist, the formed
// pairs are listed under their division; while pairs are still forming, the list stays flat.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { teamsApi } from './api'
import PairChoice from './PairChoice'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
type Movement = { up: boolean; down: boolean; gapUp: number | null; gapDown: number | null }
type Gain = { playerId: number; points: number }
const pair = (id: number, a: ReturnType<typeof player>, b: ReturnType<typeof player>, rankingPoints: number, movement: Movement | null = null, gains: Gain[] | null = null) => ({
  id, source: 'mutual', players: [a, b], rankingPoints, movement, gains,
  startPoints: [{ playerId: a.id, points: rankingPoints * 0.6 }, { playerId: b.id, points: rankingPoints * 0.4 }],
})
const [cou, dinis, pancho, archer] = [player(1, 'Cou'), player(2, 'Dinis'), player(3, 'Pancho'), player(4, 'Archer')]
const state = (pairingClosed: boolean) => ({
  miniTournament: { id: 34, number: 1, pairingDeadline: null, pairingClosed, pairingOpen: false, ended: false },
  players: [cou, dinis, pancho, archer].map(p => ({ ...p, rankingPoints: 0, rankingPosition: null, paired: true, allowedForMe: false })),
  pairs: [
    pair(1, pancho, archer, 300, pairingClosed ? { up: true, down: false, gapUp: -201.92, gapDown: -19.5 } : null),
    pair(2, cou, dinis, 900, pairingClosed ? { up: false, down: true, gapUp: null, gapDown: 201.92 } : null),
  ],
  me: { playerId: null, inRoster: false, myChoice: null, choseMe: [], pairId: null, isAdmin: false },
})
const competition = (withGroups: boolean) => ({
  id: 27, stages: [{ id: 34, number: 1, status: 'running', groups: withGroups ? [{ id: 138, name: '1.ª Divisão', tier: 1, pointsRange: { min: 66, max: 545 } }, { id: 139, name: '2.ª Divisão', tier: 2, pointsRange: { min: 33, max: 272.5 } }] : [], rounds: [] }],
  currentStageId: 34,
})
vi.mock('./api', () => ({
  teamsApi: { state: vi.fn(async () => ({ data: mocked.state })) },
  teamsV2Api: { competition: vi.fn(async () => mocked.competition) },
}))
vi.mock('@/features/results/api', () => ({
  errorMessage: () => 'erro',
  resultsApi: {
    group: vi.fn(async (id: number) => ({ id, name: id === 138 ? '1.ª Divisão' : '2.ª Divisão', tier: id === 138 ? 1 : 2, pointsRange: id === 138 ? { min: 66, max: 545 } : { min: 33, max: 272.5 }, members: id === 138 ? [cou, dinis] : [pancho, archer] })),
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
    expect(within(first).getByText('Cou')).toBeInTheDocument()
    expect(within(first).queryByText('Pancho')).toBeNull()
    expect(within(second).getByText('Pancho')).toBeInTheDocument()
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Parelhas formadas (2/2)')).toBeInTheDocument()
    expect(within(first).getByText('66–545 pts')).toBeInTheDocument() // what a player can take out of the division
    expect(within(second).getByText('33–273 pts')).toBeInTheDocument() // formatPoints rounds for display
  })

  it('shows the arrow and the gap in points per pair, as served by the backend', async () => {
    mocked.state = state(true)
    mocked.competition = competition(true)
    renderTab()
    const first = await screen.findByRole('region', { name: /1\.ª Divisão/ })
    const top = within(first).getByLabelText('Subir ou descer') // Cou & Dinis: 1.ª, only the way down
    expect(top).toHaveTextContent('↓ risco 202')
    expect(top).not.toHaveTextContent('↑')
    expect(within(top).getByText(/risco/)).toHaveClass('text-amber-700')
    const second = screen.getByRole('region', { name: /2\.ª Divisão/ })
    const lower = within(second).getByLabelText('Subir ou descer')
    expect(lower).toHaveTextContent('↑ folga 202')
    expect(lower).toHaveTextContent('↓ seguro 20')
    expect(within(lower).getByText(/folga/)).toHaveClass('text-green-700')
    expect(within(lower).getByText(/seguro/)).toHaveClass('text-gray-400')
  })

  it('shows nothing about moving while the divisions do not exist', async () => {
    mocked.state = state(false)
    mocked.competition = competition(false)
    renderTab()
    await screen.findByText('Cou')
    expect(screen.queryByLabelText('Subir ou descer')).toBeNull()
  })

  it('keeps the flat list while the divisions are not formed', async () => {
    mocked.state = state(false)
    mocked.competition = competition(false)
    renderTab()
    expect(await screen.findByText('Cou')).toBeInTheDocument()
    expect(screen.getByText('Pancho')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Divisão/ })).toBeNull()
  })
})

describe('Parelhas of a mini-torneio', () => {
  it('asks for the stage picked in the header', async () => {
    mocked.state = state(true)
    mocked.competition = competition(true)
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><PairChoice competitionId={27} stageId={35} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText('Parelhas formadas (2/2)')
    expect(teamsApi.state).toHaveBeenLastCalledWith(27, 35)
  })

  it('shows what the pair and each player earned once it is over, and no projection', async () => {
    const over = state(true)
    over.miniTournament.ended = true
    over.pairs[0] = pair(1, pancho, archer, 300, null, [{ playerId: 3, points: 67.41 }, { playerId: 4, points: 50 }])
    mocked.state = over
    mocked.competition = competition(true)
    renderTab()
    expect(await screen.findByText('Mini-torneio terminado.')).toBeTruthy()
    expect(await screen.findByText('Pontos no início do mini-torneio.')).toBeTruthy()
    const item = (await screen.findByText('Pancho')).closest('li') as HTMLElement
    expect(within(item).getByText('Início')).toBeTruthy()
    expect(within(item).getByText('Ganhos')).toBeTruthy()
    for (const value of ['180', '120', '300', '+67', '+50']) expect(within(item).getByText(value)).toBeTruthy()
    expect(within(item).getByTitle('Pontos de ranking ganhos pela parelha neste mini-torneio').textContent).toBe('+117')
    expect(within(item).queryByText(/escolha mútua/)).toBeNull()
    expect(within(item).queryByLabelText('Subir ou descer')).toBeNull()
  })

  it('names how a pair was formed only when it was not a mutual choice', async () => {
    const withAdmin = state(true)
    withAdmin.pairs[0] = { ...withAdmin.pairs[0], source: 'admin' }
    mocked.state = withAdmin
    mocked.competition = competition(true)
    renderTab()
    expect(await screen.findByText('· organização')).toBeTruthy()
    expect(screen.queryByText(/escolha mútua/)).toBeNull()
  })

  it('names a pair kept from the previous mini-torneio', async () => {
    const kept = state(true)
    kept.pairs[0] = { ...kept.pairs[0], source: 'previous' }
    mocked.state = kept
    mocked.competition = competition(true)
    renderTab()
    expect(await screen.findByText('· parelha anterior')).toBeTruthy()
  })

  it('says pair choice has not opened for a mini-torneio that has not started', async () => {
    const planned = state(false)
    planned.pairs = []
    planned.players = planned.players.map(p => ({ ...p, paired: false }))
    mocked.state = planned
    mocked.competition = competition(false)
    renderTab()
    expect(await screen.findByText('A escolha de parelhas ainda não abriu.')).toBeTruthy()
    expect(screen.queryByText(/Sem parelha/)).toBeNull()
    expect(screen.queryByText(/Faz login/)).toBeNull()
  })
})
