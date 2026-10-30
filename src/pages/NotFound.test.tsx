// The 404 page at phone width: the site's header, the Portuguese copy, the game card and
// the way home. jsdom has no canvas, so the game paints nothing here and the rules are
// covered in features/notfound/pong.test.ts.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import NotFound from './NotFound'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, logout: async () => {} }) }))
vi.mock('@/api/main', () => ({ mainApi: { index: () => new Promise(() => {}) } }))

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext
  vi.spyOn(console, 'error').mockImplementation(() => {}) // the page logs the missing path
})

function mount() {
  return render(
    <MemoryRouter initialEntries={['/isto-nao-existe']}>
      <NotFound />
    </MemoryRouter>,
  )
}

describe('NotFound', () => {
  it('reads like a v2 page: teal header, Portuguese copy, the court card and a way home', () => {
    mount()
    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByText(/A bola saiu do court/)).toBeInTheDocument()
    expect(screen.getByText('Erro 404')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pong de padel' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /arrasta para mover a raquete/i })).toBeInTheDocument()
    const home = screen.getByRole('link', { name: 'Voltar ao início' })
    expect(home).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('link', { name: 'Torneios' }).length).toBeGreaterThan(0) // the site header and footer are there
    expect(document.querySelector('.l-grid')).not.toBeNull()
  })

  it('the game waits for a serve, then the overlay goes away', () => {
    mount()
    expect(screen.getByText('Toca para jogar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Servir' }))
    expect(screen.queryByText('Toca para jogar')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Servir' })).toBeNull()
    expect(screen.getByText('Primeiro a 3 ganha')).toBeInTheDocument()
  })

  it('logs the missing path the way the old page did', () => {
    mount()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('404'), '/isto-nao-existe')
  })
})
