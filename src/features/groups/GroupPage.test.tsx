// The group page's Jogos tab: one card for everyone (Pedro, 29 Oct): visitors get the result card
// read-only (no inputs, no Mais), the same card a signed-in player edits.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import GroupPage from './GroupPage'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/features/calendar/MonthCalendar', () => ({ default: () => null }))
const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
const seat = (side: 'home' | 'away', slot: 1 | 2, id: number, name: string) => ({ side, slot, role: 'member' as const, player: player(id, name) })
vi.mock('./api', () => ({
  useGroup: () => ({
    isLoading: false,
    error: null,
    data: {
      id: 72, name: '1.ª Divisão', hasEnded: true, standings: [], rounds: [{ id: 701, number: 7, date: '2026-10-13' }], currentRound: 7,
      competition: { id: 22, label: 'Outono 2026', format: 'classica', startsOn: '2026-09-01', endsOn: '2026-10-13' },
    },
  }),
  useGroupMatches: () => ({
    data: [{
      id: 10, groupId: 72, groupName: '1.ª Divisão', competitionId: 22, format: 'classica', round: 7, scheduledAt: '2026-10-13T21:30:00Z', court: 'Campo 1',
      status: 'played', participants: [seat('home', 1, 1, 'Bernardo C'), seat('home', 2, 2, 'Dinis'), seat('away', 1, 3, 'Pancho'), seat('away', 2, 4, 'Joao Archer')],
      sets: [{ setNo: 1, homeGames: 7, awayGames: 6, outcome: 'completed' }], homeScore: 7, awayScore: 6, winner: 'home', absences: [],
    }],
  }),
}))

describe('GroupPage Jogos for a visitor', () => {
  it('shows the read-only result card: the games as plain boxes, no inputs, no Mais', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/groups/72']}>
          <Routes><Route path="/groups/:id" element={<GroupPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Jogos' }))
    expect(screen.getByLabelText('Jogos casa').tagName).toBe('SPAN')
    expect(screen.getByLabelText('Jogos casa')).toHaveTextContent('7')
    expect(screen.getByText('13/10/26')).toBeInTheDocument()
    expect(screen.getByText('22:30')).toBeInTheDocument() // the tiny line: time (Lisbon) then court
    expect(screen.getByText('Campo 1')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Jogo 10')).queryByText(/Jornada 7/)).toBeNull() // the hint only when neither exists
    expect(screen.getByRole('button', { name: 'Bernardo C' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Mais/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resultado' })).toBeNull()
  })

  it('opens on the Jogos tab when the URL says ?tab=matches ("Editar jogos" landing)', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/groups/72?tab=matches']}>
          <Routes><Route path="/groups/:id" element={<GroupPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    // PageHeader marks the active tab with the teal colour (no aria-selected on those buttons).
    expect(screen.getByRole('button', { name: 'Jogos' })).toHaveStyle({ color: 'rgb(0, 106, 113)' })
    expect(screen.getByRole('button', { name: 'Classificação' })).not.toHaveStyle({ color: 'rgb(0, 106, 113)' })
    expect(screen.getByText('Campo 1')).toBeInTheDocument() // the round's card is already on screen
  })
})
