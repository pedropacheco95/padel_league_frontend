import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatuesPage from './StatuesPage'

describe('StatuesPage', () => {
  it('renders the three chapters of the Estatutos', () => {
    render(<StatuesPage />)
    expect(screen.getByRole('heading', { level: 1, name: '1º Regras gerais' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '2º Desempate de subidas e descidas no caso de desistência' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '3º Entrada/Saída de membros' })).toBeInTheDocument()
  })
})
