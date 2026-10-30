// The swipe guards from the design brief: distance and direction thresholds, screen edges (iOS
// back gesture), sideways-scrolling children (tabs, tables) and form fields never start a swipe.
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHorizontalSwipe } from './useHorizontalSwipe'

// jsdom has no PointerEvent: without this fireEvent.pointerDown falls back to a plain Event with no
// coordinates. A MouseEvent subclass carries clientX/Y plus the two pointer fields the hook reads.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
    }
  }
  ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
}

const left = vi.fn()
const right = vi.fn()

function List() {
  const swipe = useHorizontalSwipe({ onSwipeLeft: left, onSwipeRight: right })
  return (
    <div data-testid="list" {...swipe}>
      <div data-testid="tabs" style={{ overflowX: 'auto' }}>tabs</div>
      <input data-testid="field" />
      <p>card</p>
    </div>
  )
}

const drag = (el: Element, from: [number, number], to: [number, number]) => {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: from[0], clientY: from[1], pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientX: to[0], clientY: to[1], pointerType: 'touch' })
  fireEvent.pointerUp(el, { pointerId: 1, clientX: to[0], clientY: to[1], pointerType: 'touch' })
}

describe('useHorizontalSwipe', () => {
  beforeEach(() => {
    left.mockClear()
    right.mockClear()
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
  })

  it('calls onSwipeLeft / onSwipeRight past 60px when mostly horizontal', () => {
    const { getByTestId } = render(<List />)
    drag(getByTestId('list'), [300, 100], [200, 110])
    expect(left).toHaveBeenCalledTimes(1)
    drag(getByTestId('list'), [100, 100], [200, 90])
    expect(right).toHaveBeenCalledTimes(1)
  })

  it('ignores short drags and vertical scrolls', () => {
    const { getByTestId } = render(<List />)
    drag(getByTestId('list'), [200, 100], [150, 100]) // 50px: too short
    drag(getByTestId('list'), [200, 100], [120, 170]) // 80 vs 70: not 1.5× more horizontal than vertical
    expect(left).not.toHaveBeenCalled()
    expect(right).not.toHaveBeenCalled()
  })

  it('ignores touches starting within 24px of either screen edge (system back gesture)', () => {
    const { getByTestId } = render(<List />)
    drag(getByTestId('list'), [10, 100], [200, 100])
    drag(getByTestId('list'), [380, 100], [100, 100])
    expect(left).not.toHaveBeenCalled()
    expect(right).not.toHaveBeenCalled()
  })

  it('ignores touches starting inside a sideways scroller or a form field', () => {
    const { getByTestId } = render(<List />)
    const tabs = getByTestId('tabs')
    Object.defineProperty(tabs, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(tabs, 'clientWidth', { value: 390, configurable: true })
    drag(tabs, [300, 100], [100, 100])
    drag(getByTestId('field'), [300, 100], [100, 100])
    expect(left).not.toHaveBeenCalled()
  })

  it('ignores the mouse', () => {
    const { getByTestId } = render(<List />)
    const el = getByTestId('list')
    fireEvent.pointerDown(el, { pointerId: 2, clientX: 300, clientY: 100, pointerType: 'mouse' })
    fireEvent.pointerUp(el, { pointerId: 2, clientX: 100, clientY: 100, pointerType: 'mouse' })
    expect(left).not.toHaveBeenCalled()
  })
})
