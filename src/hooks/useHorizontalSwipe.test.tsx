// The swipe guards from the design brief: distance and direction thresholds, screen edges (iOS
// back gesture), sideways-scrolling children (tabs, tables), form fields and multi-touch never swipe.
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHorizontalSwipe } from './useHorizontalSwipe'

// jsdom's TouchEvent cannot be built from plain {clientX, clientY} objects (and there is no Touch
// constructor), so a UIEvent subclass carries the touch lists the hook reads.
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

const t = (x: number, y: number) => ({ clientX: x, clientY: y })
const drag = (el: Element, from: [number, number], to: [number, number], fingers = 1) => {
  const extra = fingers > 1 ? [t(10, 10)] : []
  fireEvent.touchStart(el, { touches: [t(...from), ...extra], changedTouches: [t(...from)] })
  fireEvent.touchMove(el, { touches: [t(...to), ...extra], changedTouches: [t(...to)] })
  fireEvent.touchEnd(el, { touches: [], changedTouches: [t(...to)] })
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

  it('ignores touches starting inside a sideways scroller or a form field, and two fingers', () => {
    const { getByTestId } = render(<List />)
    const tabs = getByTestId('tabs')
    Object.defineProperty(tabs, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(tabs, 'clientWidth', { value: 390, configurable: true })
    drag(tabs, [300, 100], [100, 100])
    drag(getByTestId('field'), [300, 100], [100, 100])
    drag(getByTestId('list'), [300, 100], [100, 100], 2)
    expect(left).not.toHaveBeenCalled()
  })

  it('a cancelled touch never fires', () => {
    const { getByTestId } = render(<List />)
    const el = getByTestId('list')
    fireEvent.touchStart(el, { touches: [t(300, 100)], changedTouches: [t(300, 100)] })
    fireEvent.touchMove(el, { touches: [t(150, 100)], changedTouches: [t(150, 100)] })
    fireEvent.touchCancel(el, { touches: [], changedTouches: [t(150, 100)] })
    fireEvent.touchEnd(el, { touches: [], changedTouches: [t(150, 100)] })
    expect(left).not.toHaveBeenCalled()
  })
})
