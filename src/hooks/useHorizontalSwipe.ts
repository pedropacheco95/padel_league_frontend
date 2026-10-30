// Horizontal swipe on one container, with no library. Bound by the caller to a specific surface
// (match list → jornada, division bar → division, hero switcher → mini-torneio).
// Touch events, not pointer events: iOS Safari fires `pointercancel` as soon as it decides a touch is
// a scroll, which kills a pointer-based gesture on any finger drift; touchstart/touchmove/touchend keep
// coming while the page scrolls, and the direction test below throws scrolls away.
// Guards (design brief "swipe conflicts"): a touch that starts within `edge` px of either screen edge
// is ignored (iOS back/forward gesture); so is one that starts inside an element that scrolls sideways
// (tabs nav, standings tables) or inside a form field, and any multi-finger touch; the gesture counts
// only when |dx| > minDistance and |dx| > ratio × |dy|. `touch-action: pan-y` keeps vertical scrolling
// native and stops horizontal page panning. Listeners are passive (React never calls preventDefault here).
import { useRef, type CSSProperties, type TouchEvent as ReactTouchEvent } from 'react'

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

type Point = { x: number; y: number }
const point = (t: { clientX: number; clientY: number } | undefined): Point | null =>
  t && Number.isFinite(t.clientX) && Number.isFinite(t.clientY) ? { x: t.clientX, y: t.clientY } : null

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  minDistance = 60,
  ratio = 1.5,
  edge = 24,
}: SwipeOptions) {
  const start = useRef<Point | null>(null)
  const last = useRef<Point | null>(null)

  const reset = () => {
    start.current = null
    last.current = null
  }

  const onTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    reset()
    if (!enabled || e.touches.length !== 1) return
    const p = point(e.touches[0])
    if (!p) return
    const width = window.innerWidth || 0
    if (p.x < edge || (width > 0 && p.x > width - edge)) return
    if (startsInsideProtected(e.target, e.currentTarget)) return
    start.current = p
    last.current = p
  }

  const onTouchMove = (e: ReactTouchEvent<HTMLElement>) => {
    if (!start.current) return
    if (e.touches.length !== 1) return reset()
    const p = point(e.touches[0])
    if (p) last.current = p
  }

  const onTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const s = start.current
    const l = point(e.changedTouches?.[0]) ?? last.current
    reset()
    if (!s || !l) return
    const dx = l.x - s.x
    const dy = l.y - s.y
    if (Math.abs(dx) < minDistance || Math.abs(dx) <= ratio * Math.abs(dy)) return
    if (dx < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }

  const style: CSSProperties = { touchAction: 'pan-y' }
  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset, style }
}
