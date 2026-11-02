// Pedro and Dudas (2 Nov): admins only copy the jornada message. One tap copies the byte-identical text,
// says "Copiado" and hides the button for every admin (backend record); a failed copy changes nothing.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Competition, Match, ShareMessageState } from '@/api/v2'
import { buildTeamsShareMessage } from '@/lib/teamsShareMessage'
import ShareCopyButton from './ShareCopyButton'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const player = (id: number, name: string) => ({ id, name, fullName: name, pictureUrl: null })
const seat = (side: 'home' | 'away', slot: 1 | 2, p: ReturnType<typeof player>) => ({ side, slot, role: 'member' as const, player: p })
const match = (id: number, groupId: number, round: number): Match => ({
  id, groupId, competitionId: 27, format: 'teams', round, scheduledAt: null, court: null, status: 'scheduled',
  participants: [seat('home', 1, player(1, 'Cou')), seat('home', 2, player(2, 'Dinis')), seat('away', 1, player(3, 'Pancho')), seat('away', 2, player(4, 'Archer'))],
  sets: [], homeScore: null, awayScore: null, winner: null, absences: [],
})
const matchesByGroup: Record<number, Match[]> = { 138: [match(1, 138, 2), match(2, 138, 3)], 139: [match(3, 139, 3)] }

const open: ShareMessageState = {
  windowStartsAt: '2026-10-28T00:01:00Z',
  round: { id: 167, stageId: 34, stageNumber: 1, number: 3, date: '2026-11-03' },
  copied: false, copiedAt: null, copiedBy: null,
}
const copied: ShareMessageState = { ...open, copied: true, copiedAt: '2026-11-02T10:00:00Z', copiedBy: { id: 1, username: 'pedro' } }

const api = vi.hoisted(() => ({ shareMessage: vi.fn(), markShareCopied: vi.fn() }))
vi.mock('./api', () => ({ teamsV2Api: api }))
vi.mock('@/features/results/api', () => ({ resultsApi: { groupMatches: vi.fn(async (id: number) => matchesByGroup[id]) } }))

const competition = {
  id: 27, title: 'Teams 2026/27', label: 'Teams',
  stages: [{ id: 34, number: 1, groups: [{ id: 138, name: '1.ª Divisão', tier: 1 }, { id: 139, name: '2.ª Divisão', tier: 2 }], rounds: [{ number: 3, date: '2026-11-03' }] }],
} as unknown as Competition
const expected = buildTeamsShareMessage('Teams 2026/27', 1, 3, [
  { tier: 1, matches: [matchesByGroup[138][1]] },
  { tier: 2, matches: matchesByGroup[139] },
], '2026-11-03')

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ShareCopyButton competition={competition} />
    </QueryClientProvider>,
  )
const button = () => screen.queryByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ })

describe('ShareCopyButton', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } })
    api.markShareCopied.mockResolvedValue(copied)
  })
  afterEach(() => vi.clearAllMocks())

  it('does not show once an admin copied this window, nor when the window offers nothing', async () => {
    api.shareMessage.mockResolvedValue(copied)
    renderButton()
    await waitFor(() => expect(api.shareMessage).toHaveBeenCalled())
    expect(button()).toBeNull()
    api.shareMessage.mockResolvedValue({ ...open, round: null })
    renderButton()
    await waitFor(() => expect(api.shareMessage).toHaveBeenCalledTimes(2))
    expect(button()).toBeNull()
  })

  it('one tap copies the unchanged message, says Copiado, records the copy and disappears', async () => {
    api.shareMessage.mockResolvedValue(open)
    renderButton()
    fireEvent.click(await screen.findByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ }))
    await waitFor(() => expect(api.markShareCopied).toHaveBeenCalledWith(27, 167))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected)
    expect(expected).toContain('Mini-torneio 1 · 3ª Jornada - 03/11 às 21h30')
    expect(toast.success).toHaveBeenCalledWith('Copiado')
    await waitFor(() => expect(button()).toBeNull())
  })

  it('a failed copy keeps the button and does not mark the window', async () => {
    api.shareMessage.mockResolvedValue(open)
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => { throw new Error('denied') }) } })
    document.execCommand = vi.fn(() => false)
    renderButton()
    fireEvent.click(await screen.findByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(api.markShareCopied).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(button()).not.toBeNull()
    expect(document.querySelectorAll('textarea')).toHaveLength(0) // the hidden fallback textarea is gone
  })

  it('the fallback copy counts when the clipboard API refuses', async () => {
    api.shareMessage.mockResolvedValue(open)
    Object.assign(navigator, { clipboard: undefined })
    document.execCommand = vi.fn(() => true)
    renderButton()
    fireEvent.click(await screen.findByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ }))
    await waitFor(() => expect(api.markShareCopied).toHaveBeenCalledWith(27, 167))
    expect(toast.success).toHaveBeenCalledWith('Copiado')
  })

  it('when the record fails the button comes back for everyone to retry', async () => {
    api.shareMessage.mockResolvedValue(open)
    api.markShareCopied.mockRejectedValue(new Error('500'))
    renderButton()
    fireEvent.click(await screen.findByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: /Copiar a mensagem da 3\.ª jornada/ })).toBeInTheDocument()
  })
})
