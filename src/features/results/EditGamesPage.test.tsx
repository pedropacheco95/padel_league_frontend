// "Editar jogos" (Pedro, 30 Oct): one tap lands the signed-in player on their own division, on the
// current jornada, ready to edit. The page resolves the target from the live competitions and redirects.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { competitionsApi, useCompetitions } from '@/features/competitions/api'
import { resultsApi } from './api'
import EditGamesPage from './EditGamesPage'

const auth = { user: { id: 1, username: 'pedro', isAdmin: false, superAdmin: false, playerId: 7 } as { playerId: number | null } | null, loading: false }
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/features/competitions/api', () => ({ useCompetitions: vi.fn(), competitionsApi: { get: vi.fn() } }))
vi.mock('./api', () => ({ resultsApi: { group: vi.fn() } }))

const card = (id: number, format: string, status = 'live') => ({ id, format, status, label: `Comp ${id}`, name: `${id}` })
const stage = (id: number, status: string, groupIds: number[]) => ({ id, number: id, status, groups: groupIds.map(g => ({ id: g, name: `G${g}`, tier: g })), rounds: [] })
const detail = (id: number, members: number[], date: string | null = null) => ({
  id, name: `G${id}`, members: members.map(m => ({ id: m, name: `P${m}` })), standings: [], currentRound: 2,
  rounds: [{ id: 1, number: 1, date: null }, { id: 2, number: 2, date }],
})

function Probe() {
  const l = useLocation()
  return <p data-testid="landed">{l.pathname + l.search}</p>
}
const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/editar-jogos']}>
        <Routes>
          <Route path="/editar-jogos" element={<EditGamesPage />} />
          <Route path="/login" element={<Probe />} />
          <Route path="/groups/:id" element={<Probe />} />
          <Route path="/competitions/:id" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const landed = async (path: string) => waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent(path))

describe('EditGamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 1, username: 'pedro', isAdmin: false, superAdmin: false, playerId: 7 }
    auth.loading = false
    vi.mocked(useCompetitions).mockReturnValue({ data: [card(27, 'teams'), card(25, 'classica', 'ended')], isLoading: false, isError: false } as never)
    vi.mocked(competitionsApi.get).mockImplementation(async id => {
      if (id === 27) return { ...card(27, 'teams'), currentStageId: 34, stages: [stage(34, 'running', [138, 139]), stage(35, 'planned', [])] } as never
      if (id === 28) return { ...card(28, 'classica'), currentStageId: 1, stages: [stage(1, 'running', [80])] } as never
      throw new Error('unknown')
    })
    vi.mocked(resultsApi.group).mockImplementation(async id => detail(id, id === 139 ? [7, 8] : id === 80 ? [7] : [1, 2]) as never)
  })

  it('Teams: lands on the competition page, Jogos section, the player’s division', async () => {
    renderPage()
    await landed('/competitions/27?section=matches&group=139')
    expect(competitionsApi.get).not.toHaveBeenCalledWith(25) // ended competitions are not read
  })

  it('Clássica: lands on the group page, Jogos tab', async () => {
    vi.mocked(useCompetitions).mockReturnValue({ data: [card(28, 'classica')], isLoading: false, isError: false } as never)
    renderPage()
    await landed('/groups/80?tab=matches')
  })

  it('in both: the competition whose current jornada is nearest today', async () => {
    vi.mocked(useCompetitions).mockReturnValue({ data: [card(27, 'teams'), card(28, 'classica')], isLoading: false, isError: false } as never)
    const far = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
    const near = new Date().toISOString().slice(0, 10)
    vi.mocked(resultsApi.group).mockImplementation(async id =>
      (id === 139 ? detail(139, [7], near) : id === 80 ? detail(80, [7], far) : detail(id, [1])) as never)
    renderPage()
    await landed('/competitions/27?section=matches&group=139')
  })

  it('not in the live competition: says so and links to it', async () => {
    auth.user = { ...auth.user!, playerId: 99 }
    renderPage()
    await screen.findByText('Não estás em nenhuma divisão da competição a decorrer.')
    expect(screen.getByRole('link', { name: 'Comp 27' })).toHaveAttribute('href', '/competitions/27')
    expect(screen.queryByTestId('landed')).toBeNull()
  })

  it('nothing live: says so', async () => {
    vi.mocked(useCompetitions).mockReturnValue({ data: [card(25, 'classica', 'ended')], isLoading: false, isError: false } as never)
    renderPage()
    await screen.findByText('Não há nenhuma competição a decorrer.')
  })

  it('while the session is still being restored: waits instead of bouncing to login', async () => {
    auth.user = null
    auth.loading = true
    renderPage()
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByTestId('landed')).toBeNull()
    expect(document.querySelector('.loader')).not.toBeNull()
  })

  it('signed out: goes to the login page', async () => {
    auth.user = null
    renderPage()
    await landed('/login')
  })
})
