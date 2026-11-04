// The gate at work: a render crash, a confirmed outage, and the failures that must not
// take the site away. jsdom has no canvas, so the game paints nothing here.
import { act, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the caught crash
})

// The outage flag lives in the module, so every test gets a fresh copy.
async function load() {
  vi.resetModules()
  const { default: OutageGate } = await import('./OutageGate')
  const outage = await import('./outage')
  return { OutageGate, ...outage }
}

const Crash = (): JSX.Element => {
  throw new Error('boom')
}

describe('OutageGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows the page when rendering crashes', async () => {
    const { OutageGate } = await load()
    render(<OutageGate><Crash /></OutageGate>)
    expect(screen.getByRole('heading', { level: 1, name: 'Problemas técnicos' })).toBeInTheDocument()
    expect(screen.getByText(/incomodozinho/)).toBeInTheDocument()
  })

  it('shows the page when a failed request is confirmed by the probe', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 500 } })
    const { OutageGate, reportServerFailure } = await load()
    render(<OutageGate><p>site</p></OutageGate>)
    act(() => reportServerFailure())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Problemas técnicos' })).toBeInTheDocument())
    expect(screen.queryByText('site')).not.toBeInTheDocument()
  })

  it('keeps the site when only one endpoint failed', async () => {
    const probe = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200 })
    const { OutageGate, reportServerFailure } = await load()
    render(<OutageGate><p>site</p></OutageGate>)
    await act(async () => reportServerFailure())
    expect(probe).toHaveBeenCalledTimes(1)
    expect(screen.getByText('site')).toBeInTheDocument()
  })

  it('does not blame the server when the visitor is offline', async () => {
    const probe = vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { OutageGate, reportServerFailure } = await load()
    render(<OutageGate><p>site</p></OutageGate>)
    await act(async () => reportServerFailure())
    expect(probe).not.toHaveBeenCalled()
    expect(screen.getByText('site')).toBeInTheDocument()
  })

  it('counts 5xx and no answer as server failures, not 4xx', async () => {
    const { isServerFailure } = await load()
    expect(isServerFailure({ response: { status: 502 } })).toBe(true)
    expect(isServerFailure(new Error('Network Error'))).toBe(true)
    expect(isServerFailure({ response: { status: 404 } })).toBe(false)
    expect(isServerFailure({ response: { status: 401 } })).toBe(false)
  })
})
