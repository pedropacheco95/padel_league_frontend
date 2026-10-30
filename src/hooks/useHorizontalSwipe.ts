// Horizontal swipe on one container, with no library. Bound by the caller to the match list only.
// Guards (design brief "swipe conflicts"): a touch that starts within `edge` px of either screen edge
// is ignored (iOS back/forward gesture); so is one that starts inside an element that scrolls sideways
// (tabs nav, standings tables) or inside a form field; the gesture counts only when |dx| > minDistance
// and |dx| > ratio × |dy|. `touch-action: pan-y` keeps vertical scrolling native.
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

export type SwipeOptions = {
  /** Finger moves left (content goes to the next item). */
  onSwipeLeft?: () => void
  /** Finger moves right (content goes to the previous item). */
  onSwipeRight?: () => void
  enabled?: boolean
  minDistance?: number
  ratio?: number
  edge?: number
}

const FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** True when `target` (or an ancestor below `root`) is a form field or scrolls horizontally. */
export function startsInsideProtected(target: EventTarget | null, root: Element): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== root) {
    if (FIELDS.has(el.tagName) || el.getAttribute('contenteditable') === 'true') return true
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  minDistance = 60,
  ratio = 1.5,
  edge = 24,
}: SwipeOptions) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)

  const reset = () => {
    start.current = null
    last.current = null
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || e.pointerType === 'mouse') return
    const width = window.innerWidth || 0
    if (e.clientX < edge || (width > 0 && e.clientX > width - edge)) return reset()
    if (startsInsideProtected(e.target, e.currentTarget)) return reset()
    start.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    last.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (start.current && e.pointerId === start.current.id) last.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const s = start.current
    const l = last.current
    reset()
    if (!s || !l || e.pointerId !== s.id) return
    const dx = (Number.isFinite(e.clientX) ? e.clientX : l.x) - s.x
    const dy = (Number.isFinite(e.clientY) ? e.clientY : l.y) - s.y
    if (Math.abs(dx) < minDistance || Math.abs(dx) <= ratio * Math.abs(dy)) return
    if (dx < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }

  const style: CSSProperties = { touchAction: 'pan-y' }
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset, style }
}
