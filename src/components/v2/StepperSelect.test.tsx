import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StepperSelect from './StepperSelect'

const options = [
  { key: 1, label: 'Jornada 1', hint: '20/10/26' },
  { key: 2, label: 'Jornada 2', current: true },
  { key: 3, label: 'Jornada 3' },
]

describe('StepperSelect', () => {
  it('steps with the arrows and disables them at the ends', () => {
    const onChange = vi.fn()
    const { rerender } = render(<StepperSelect variant="header" title="Jornada" options={options} value={1} onChange={onChange} />)
    expect(screen.getByLabelText('Anterior')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Seguinte'))
    expect(onChange).toHaveBeenCalledWith(2)
    rerender(<StepperSelect variant="header" title="Jornada" options={options} value={3} onChange={onChange} />)
    expect(screen.getByLabelText('Seguinte')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Anterior'))
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('opens a sheet with every option on the label and picks one', () => {
    const onChange = vi.fn()
    render(<StepperSelect variant="pill" title="Jornada" options={options} value={2} onChange={onChange} />)
    expect(screen.getByText('atual')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Jornada: Jornada 2. Abrir lista'))
    const list = screen.getByRole('listbox', { name: 'Jornada' })
    expect(list.querySelectorAll('[role=option]')).toHaveLength(3)
    expect(screen.getByText('20/10/26')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Jornada 3/ }))
    expect(onChange).toHaveBeenCalledWith(3)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('renders nothing with a single option', () => {
    const { container } = render(<StepperSelect variant="subheader" title="Divisão" options={[options[0]]} value={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('subheader shows the neighbours, the dots and the "a tua" tag', () => {
    render(
      <StepperSelect
        variant="subheader"
        title="Divisão"
        options={[{ key: 1, label: '1.ª Divisão', mine: true }, { key: 2, label: '2.ª Divisão' }, { key: 3, label: '3.ª Divisão' }]}
        value={2}
        onChange={() => {}}
      />,
    )
    const group = screen.getByRole('group', { name: 'Divisão' })
    expect(group).toHaveTextContent('1.ª Divisão')
    expect(group).toHaveTextContent('3.ª Divisão')
    expect(screen.getByLabelText('Divisão: 2.ª Divisão. Abrir lista')).toHaveTextContent('2.ª Divisão')
    expect(group.querySelectorAll('i')).toHaveLength(3)
    fireEvent.click(screen.getByLabelText('Divisão: 2.ª Divisão. Abrir lista'))
    expect(screen.getByRole('listbox')).toHaveTextContent('a tua')
  })

  it('pill hides while a text field has the focus (iOS keyboard)', () => {
    render(
      <>
        <input aria-label="games" />
        <StepperSelect variant="pill" title="Jornada" options={options} value={1} onChange={() => {}} />
      </>,
    )
    const pill = screen.getByRole('group', { name: 'Jornada' })
    expect(pill.style.visibility).toBe('visible')
    const input = screen.getByLabelText('games')
    fireEvent.focusIn(input)
    expect(pill.style.visibility).toBe('hidden')
    fireEvent.focusOut(input, { relatedTarget: null })
    expect(pill.style.visibility).toBe('visible')
  })
})
