// The inline result card: type in the header, Guardar appears, the bar reads "por guardar" until saved;
// tap a player → ✕ → the "ele não veio" panel. Read-only without a session.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match } from '@/api/v2'
import ResultCard from './ResultCard'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'pedro', isAdmin: true } }) }))
vi.mock('./api', async importOriginal => {
  const mod = await importOriginal<typeof import('./api')>()
  return {
    ...mod,
    resultsApi: {
      ...mod.resultsApi,
      players: vi.fn(async () => []),
      substitutes: vi.fn(async () => []),
      putResult: vi.fn(),
      clearResult: vi.fn(),
    },
  }
})
import { resultsApi } from './api'

const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
const seat = (side: 'home' | 'away', slot: 1 | 2, id: number, name: string) => ({ side, slot, role: 'member' as const, player: player(id, name) })

const match = (over: Partial<Match> = {}): Match => ({
  id: 10,
  groupId: 5,
  groupName: '1.ª Divisão',
  competitionId: 27,
  format: 'teams',
  round: 3,
  scheduledAt: '2026-11-03T21:30:00Z',
  court: null,
  status: 'scheduled',
  inProgress: false,
  participants: [seat('home', 1, 1, 'Pancho'), seat('home', 2, 2, 'Pi'), seat('away', 1, 3, 'Talinho'), seat('away', 2, 4, 'Dudas')],
  sets: [],
  homeScore: null,
  awayScore: null,
  winner: null,
  absences: [],
  ...over,
})

const renderCard = (m: Match, editable = true) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui = (mm: Match) => (
    <QueryClientProvider client={qc}>
      <ResultCard match={mm} roundId={7} editable={editable} />
    </QueryClientProvider>
  )
  const r = render(ui(m))
  return { ...r, rerender: (mm: Match) => r.rerender(ui(mm)) }
}

beforeEach(() => vi.clearAllMocks())

describe('ResultCard', () => {
  it('shows Guardar only once a set is typed, says "por guardar", and saves set by set', async () => {
    const saved = match({ inProgress: true, sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }] })
    vi.mocked(resultsApi.putResult).mockResolvedValue(saved)
    const { rerender } = renderCard(match())
    expect(screen.getByText(/Jornada 3/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Guardar/ })).toBeNull()

    fireEvent.change(screen.getByLabelText('Set 1 casa'), { target: { value: '6' } })
    expect(screen.queryByRole('button', { name: /Guardar/ })).toBeNull() // half a set is nothing to save
    fireEvent.change(screen.getByLabelText('Set 1 fora'), { target: { value: '3' } })
    expect(screen.getByText('por guardar')).toBeInTheDocument()
    expect(screen.getByText('Pontos até agora: 3 – 0')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar 1 set' }))
    await waitFor(() => expect(resultsApi.putResult).toHaveBeenCalledWith(10, { sets: [{ homeGames: 6, awayGames: 3, outcome: 'completed' }] }))
    rerender(saved) // the list's cache now holds the saved match
    await screen.findByText('Guardado')
    expect(screen.getByLabelText('Set 1 casa')).toHaveValue('6')
    expect(screen.queryByText('por guardar')).toBeNull()
  })

  it('keeps the saved sets typed in place and Cancelar puts them back', () => {
    renderCard(match({ inProgress: true, sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }] }))
    expect(screen.getByLabelText('Set 1 casa')).toHaveValue('6')
    expect(screen.getByText('em curso')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Set 2 casa'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Set 2 fora'), { target: { value: '6' } })
    expect(screen.getByRole('button', { name: 'Guardar 2 sets' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByLabelText('Set 2 casa')).toHaveValue('')
    expect(screen.queryByRole('button', { name: /Guardar/ })).toBeNull()
  })

  it('tap a player → ✕ → the "ele não veio" panel', async () => {
    renderCard(match())
    fireEvent.click(screen.getByRole('button', { name: 'Pancho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pancho não veio' }))
    expect(await screen.findByText(/Tens a certeza que queres tirar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim, ele não veio' })).toBeInTheDocument()
  })

  it('Mais ▾ holds Tempo esgotado, W.O. and Apagar resultado', () => {
    renderCard(match({ status: 'played', sets: [1, 2, 3].map(n => ({ setNo: n, homeGames: 6, awayGames: 3, outcome: 'completed' as const })), homeScore: 9, awayScore: 0, winner: 'home' }))
    expect(screen.getByText('Pontos: 9 – 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mais/ }))
    expect(screen.getByRole('button', { name: 'Tempo esgotado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'W.O.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apagar resultado' }))
    expect(screen.getByRole('button', { name: 'Sim, apagar' })).toBeInTheDocument()
  })

  it('is read-only without a session: the saved sets as plain boxes, no inputs, no Mais', () => {
    renderCard(match({ inProgress: true, sets: [{ setNo: 1, homeGames: 6, awayGames: 3, outcome: 'completed' }] }), false)
    expect(screen.getByLabelText('Set 1 casa').tagName).toBe('SPAN')
    expect(screen.getByLabelText('Set 1 casa')).toHaveTextContent('6')
    expect(screen.getByText('1 – 0')).toBeInTheDocument() // the SETS tally
    expect(screen.getByRole('button', { name: 'Pancho' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Mais/ })).toBeNull()
  })

  it('Clássica: one pair of games', () => {
    renderCard(match({ format: 'classica' }))
    fireEvent.change(screen.getByLabelText('Jogos casa'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Jogos fora'), { target: { value: '4' } })
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Set 2 casa')).toBeNull()
  })
})
