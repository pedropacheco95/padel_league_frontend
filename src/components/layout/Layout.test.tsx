// Nav entry points (Pedro, 30 Oct): the Chatbot tab is retired (route kept), Estatutos has a page again.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }))
vi.mock('@/api/main', () => ({ mainApi: { index: () => new Promise(() => {}) } }))

describe('Layout nav', () => {
  it('has no Chatbot link anywhere, and the footer Estatutos link points at /statues', () => {
    render(<MemoryRouter><Layout><p>page</p></Layout></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /chatbot/i })).toBeNull()
    expect(screen.getByRole('link', { name: 'Estatutos' })).toHaveAttribute('href', '/statues')
    expect(screen.getAllByRole('link', { name: 'Torneios' })).toHaveLength(2) // nav + footer still there
  })
})
