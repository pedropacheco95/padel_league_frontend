// Pedro (30 Oct): the jornada message floats at the top after a result is saved, with copy and close,
// instead of sitting inline. The message text (lib/teamsShareMessage) is unchanged.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Competition, Match, Stage } from '@/api/v2'
import { emitResultSaved, resetResultSaved } from '@/features/results/resultSaved'
import ShareMessagePanel from './ShareMessagePanel'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
const seat = (side: 'home' | 'away', slot: 1 | 2, p: ReturnType<typeof player>) => ({ side, slot, role: 'member' as const, player: p })
const match = (id: number, round: number, status: Match['status']): Match => ({
  id, groupId: 138, competitionId: 27, format: 'teams', round, scheduledAt: null, court: null, status,
  participants: [seat('home', 1, player(1, 'Cou')), seat('home', 2, player(2, 'Dinis')), seat('away', 1, player(3, 'Pancho')), seat('away', 2, player(4, 'Archer'))],
  sets: [], homeScore: null, awayScore: null, winner: null, absences: [],
})
const matches = [match(1, 1, 'played'), match(2, 2, 'scheduled')]
vi.mock('@/features/results/api', () => ({
  resultsApi: { groupMatches: vi.fn(async () => matches) },
}))

const competition = { id: 27, title: 'Teams 2026/27', label: 'Teams' } as unknown as Competition
const stage = { id: 34, number: 1, status: 'running', groups: [{ id: 138, name: '1.ª Divisão', tier: 1 }], rounds: [{ number: 2, date: '2026-11-03' }] } as unknown as Stage

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ShareMessagePanel competition={competition} stage={stage} />
    </QueryClientProvider>,
  )
const dialog = () => screen.queryByRole('dialog', { name: 'Mensagem da jornada' })

describe('ShareMessagePanel', () => {
  beforeEach(() => {
    resetResultSaved()
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } })
  })
  afterEach(() => vi.clearAllMocks())

  it('stays closed until a result of this mini-tournament is saved, then floats with the next jornada', async () => {
    renderPanel()
    expect(await screen.findByRole('button', { name: 'Mensagem da jornada' })).toBeInTheDocument()
    expect(dialog()).toBeNull()
    act(() => emitResultSaved({ groupId: 999, matchId: 5 })) // another competition's group
    expect(dialog()).toBeNull()
    act(() => emitResultSaved({ groupId: 138, matchId: 1 }))
    expect(dialog()).not.toBeNull()
    const text = (screen.getByRole('textbox') as HTMLTextAreaElement).value
    expect(text).toContain('Mini-torneio 1 · 2ª Jornada - 03/11 às 21h30')
    expect(text).toContain('🟡 Cou\n🟡 Dinis\n🔴 Pancho\n🔴 Archer')
  })

  it('copies the message and closes; closing keeps it closed until the next save', async () => {
    renderPanel()
    await screen.findByRole('button', { name: 'Mensagem da jornada' })
    act(() => emitResultSaved({ groupId: 138, matchId: 1 }))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith((screen.getByRole('textbox') as HTMLTextAreaElement).value)
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!) // the text button; the × is the other
    expect(dialog()).toBeNull()
    expect(screen.getByRole('button', { name: 'Mensagem da jornada' })).toBeInTheDocument()
    act(() => emitResultSaved({ groupId: 138, matchId: 2 }))
    expect(dialog()).not.toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!) // the text button; the × is the other
    fireEvent.click(screen.getByRole('button', { name: 'Mensagem da jornada' })) // reachable by hand too
    expect(dialog()).not.toBeNull()
  })

  it('falls back to selecting the text when the clipboard API refuses', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => { throw new Error('denied') }) } })
    document.execCommand = vi.fn(() => true)
    renderPanel()
    await screen.findByRole('button', { name: 'Mensagem da jornada' })
    act(() => emitResultSaved({ groupId: 138, matchId: 1 }))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    const area = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(area.selectionEnd - area.selectionStart).toBe(area.value.length)
    ;(document.execCommand as unknown as { mockReturnValue: (v: boolean) => void }).mockReturnValue(false)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('renders the opener into the given slot (the sticky division bar, bug-955) instead of inline', async () => {
    const slot = document.createElement('div')
    document.body.appendChild(slot)
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ShareMessagePanel competition={competition} stage={stage} openerSlot={slot} />
      </QueryClientProvider>,
    )
    const opener = await screen.findByRole('button', { name: 'Mensagem da jornada' })
    expect(slot.contains(opener)).toBe(true)
    fireEvent.click(opener)
    expect(dialog()).not.toBeNull()
    expect(slot.contains(screen.getByRole('button', { name: 'Mensagem da jornada' }))).toBe(true) // stays while open
    slot.remove()
  })
})
