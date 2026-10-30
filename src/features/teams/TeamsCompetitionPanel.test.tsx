// Direction C filters (Pedro, 30 Oct): the Jogos tab opens on the signed-in player's division and the
// current jornada; the jornada survives a division change; a competition with one mini-tournament or
// one division hides that control.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Competition } from '@/api/v2'
import { resultsApi } from '@/features/results/api'
import TeamsCompetitionPanel from './TeamsCompetitionPanel'

// jsdom's TouchEvent cannot be built from plain touch objects; see useHorizontalSwipe.test.tsx.
type T = { clientX: number; clientY: number }
class TouchEventPolyfill extends UIEvent {
  touches: T[]
  changedTouches: T[]
  constructor(type: string, init: UIEventInit & { touches?: T[]; changedTouches?: T[] } = {}) {
    super(type, init)
    this.touches = init.touches ?? []
    this.changedTouches = init.changedTouches ?? []
  }
}
;(window as unknown as { TouchEvent: typeof TouchEventPolyfill }).TouchEvent = TouchEventPolyfill
const swipe = (el: Element, fromX: number, toX: number) => {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: 300 }], changedTouches: [{ clientX: fromX, clientY: 300 }] })
  fireEvent.touchMove(el, { touches: [{ clientX: toX, clientY: 305 }], changedTouches: [{ clientX: toX, clientY: 305 }] })
  fireEvent.touchEnd(el, { touches: [], changedTouches: [{ clientX: toX, clientY: 305 }] })
}

const auth = { user: { id: 1, username: 'pedro', isAdmin: false, superAdmin: false, playerId: 7 } as { playerId: number | null } | null }
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('./PairChoice', () => ({ default: () => null, Avatar: () => null }))
vi.mock('./TeamsProjection', () => ({ DivisionsProjection: () => null, PartnerSimulator: () => null }))
vi.mock('./api', () => ({ teamsV2Api: { competition: vi.fn(), standings: vi.fn(), formDivisions: vi.fn() } }))
vi.mock('@/features/results/api', () => ({
  resultsApi: { group: vi.fn(), groupMatches: vi.fn() },
  errorMessage: () => 'erro',
}))

const rounds = (stageNo: number) => [1, 2, 3].map(n => ({ id: stageNo * 100 + n, number: n, date: null }))
const group = (id: number, tier: number) => ({ id, name: `${tier}.ª Divisão`, tier, hasEnded: false })
const competition = (stages: number, groups: number): Competition =>
  ({
    id: 27, label: '23ª Edição - Teams', name: '23ª Edição', format: 'teams', status: 'live', rules: {},
    currentStageId: stages,
    stages: Array.from({ length: stages }, (_, i) => ({
      id: i + 1, number: i + 1, status: i + 1 === stages ? 'running' : 'ended', pairingClosed: true,
      groups: Array.from({ length: groups }, (_, j) => group((i + 1) * 10 + j + 1, j + 1)),
      rounds: rounds(i + 1),
    })),
  }) as unknown as Competition

const renderPanel = (c: Competition, url = '/competitions/27') => {
  vi.mocked(resultsApi.group).mockImplementation(async id => ({
    ...group(id, id % 10), competition: { id: 27 }, stage: {}, standings: [],
    members: id % 10 === 2 ? [{ id: 7, name: 'Pedro' }] : [{ id: 99, name: 'Outro' }],
    rounds: rounds(Math.floor(id / 10)), currentRound: 2,
  }) as never)
  vi.mocked(resultsApi.groupMatches).mockResolvedValue([])
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <TeamsCompetitionPanel competition={c} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  if (url === '/competitions/27') fireEvent.click(screen.getByRole('tab', { name: 'Jogos' }))
}

describe('TeamsCompetitionPanel filters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens on the player’s division and the current jornada, with the mini-torneio switcher in the header', async () => {
    renderPanel(competition(2, 3))
    expect(screen.getByLabelText('Mini-torneio: Mini-torneio 2. Abrir lista')).toHaveTextContent('de 2')
    await waitFor(() => expect(screen.getByLabelText('Divisão: 2.ª Divisão. Abrir lista')).toHaveTextContent('a tua'))
    await waitFor(() => expect(screen.getByRole('group', { name: 'Jornada' })).toHaveTextContent('Jornada 2'))
    expect(screen.getByRole('group', { name: 'Jornada' })).toHaveTextContent('atual')
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(22, 2))
    expect(resultsApi.groupMatches).not.toHaveBeenCalledWith(21, expect.anything())
  })

  it('keeps the jornada when the division changes with the arrow', async () => {
    renderPanel(competition(2, 3))
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(22, 2))
    const division = screen.getByRole('group', { name: 'Divisão' })
    fireEvent.click(division.querySelector('[aria-label="Seguinte"]')!)
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(23, 2))
    expect(screen.getByLabelText('Divisão: 3.ª Divisão. Abrir lista')).toBeInTheDocument()
  })

  it('swiping the match list steps the jornada; the division bar steps the division; the hero row steps the mini-torneio', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    renderPanel(competition(2, 3))
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(22, 2))
    swipe(screen.getByText('Sem jogos nesta jornada.'), 300, 150) // left on the list → next jornada
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(22, 3))
    expect(screen.getByRole('group', { name: 'Jornada' })).toHaveTextContent('Jornada 3')
    swipe(screen.getByRole('group', { name: 'Divisão' }), 300, 150) // left on the sticky bar → next division, jornada kept
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(23, 3))
    swipe(screen.getByRole('group', { name: 'Mini-torneio' }), 100, 250) // right on the hero row → previous mini-torneio
    expect(screen.getByLabelText('Mini-torneio: Mini-torneio 1. Abrir lista')).toBeInTheDocument()
  })

  it('hides the mini-torneio and division controls when there is only one of each', async () => {
    auth.user = null
    renderPanel(competition(1, 1))
    expect(screen.queryByRole('group', { name: 'Mini-torneio' })).toBeNull()
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(11, 2))
    expect(screen.queryByRole('group', { name: 'Divisão' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Jornada' })).toHaveTextContent('Jornada 2')
    auth.user = { playerId: 7 }
  })

  it('lands on the Jogos section and the division named in the URL ("Editar jogos")', async () => {
    renderPanel(competition(2, 3), '/competitions/27?section=matches&group=23')
    expect(screen.getByRole('tab', { name: 'Jogos' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getByLabelText('Divisão: 3.ª Divisão. Abrir lista')).toBeInTheDocument())
    await waitFor(() => expect(resultsApi.groupMatches).toHaveBeenCalledWith(23, 2))
  })
})
