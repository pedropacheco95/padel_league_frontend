// Horizontal swipe on one container, with no library. Bound by the caller to a specific surface
// (match list → jornada, division bar → division, hero switcher → mini-torneio).
// Touch events, not pointer events: iOS Safari fires `pointercancel` as soon as it decides a touch is
// a scroll, which kills a pointer-based gesture on any finger drift; touchstart/touchmove/touchend keep
// coming while the page scrolls, and the direction test below throws scrolls away.
// Guards (design brief "swipe conflicts"): a touch that starts within `edge` px of either screen edge
// is ignored (iOS back/forward gesture); so is one that starts inside an element that scrolls sideways
// (tabs nav, standings tables) or inside a form field that has the focus, and any multi-finger touch; the gesture counts
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

/** True when `target` (or an ancestor below `root`) is a form field WITH the focus (text selection or
 * caret drag in progress) or scrolls horizontally. An idle score box is just part of the card: a swipe
 * may start on it, so the teal header bar of a result card swipes like the rest of the card. */
export function startsInsideProtected(target: EventTarget | null, root: Element): boolean {
  let el = target instanceof Element ? target : null
  const active = typeof document === 'undefined' ? null : document.activeElement
  while (el && el !== root) {
    if ((FIELDS.has(el.tagName) || el.getAttribute('contenteditable') === 'true') && el === active) return true
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

type Point = { x: number; y: number }

/** On-device diagnostics (Pedro's iPhone, 30 Oct): with `?swipedebug=1` in the URL the hook records what it
 * sees and SwipeDebugOverlay shows it. Nothing is recorded otherwise. */
export const swipeTrace: { enabled: boolean; lines: string[]; listeners: Set<() => void> } = {
  enabled: typeof location !== 'undefined' && /[?&]swipedebug=1/.test(location.search),
  lines: [],
  listeners: new Set(),
}
function trace(line: string) {
  if (!swipeTrace.enabled) return
  swipeTrace.lines = [...swipeTrace.lines.slice(-7), line]
  swipeTrace.listeners.forEach(fn => fn())
}
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
    if (!enabled || e.touches.length !== 1) return trace(`start ignored: enabled=${enabled} touches=${e.touches.length}`)
    const p = point(e.touches[0])
    if (!p) return trace('start ignored: no point')
    const width = window.innerWidth || 0
    if (p.x < edge || (width > 0 && p.x > width - edge)) return trace(`start ignored: edge x=${Math.round(p.x)} w=${width}`)
    if (startsInsideProtected(e.target, e.currentTarget)) return trace(`start ignored: protected ${(e.target as Element).tagName}`)
    start.current = p
    last.current = p
    trace(`start ${Math.round(p.x)},${Math.round(p.y)} on ${(e.target as Element).tagName} w=${width}`)
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
    if (!s || !l) return trace('end without start')
    const dx = l.x - s.x
    const dy = l.y - s.y
    if (Math.abs(dx) < minDistance || Math.abs(dx) <= ratio * Math.abs(dy)) return trace(`end: no swipe dx=${Math.round(dx)} dy=${Math.round(dy)}`)
    trace(`end: swipe ${dx < 0 ? 'left' : 'right'} dx=${Math.round(dx)} dy=${Math.round(dy)}`)
    if (dx < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }
  const onTouchCancel = () => {
    if (start.current) trace('cancelled by the browser')
    reset()
  }

  const style: CSSProperties = { touchAction: 'pan-y' }
  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, style }
}
