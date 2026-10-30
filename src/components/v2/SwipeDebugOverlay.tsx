// On-device swipe diagnostics: add `?swipedebug=1` to the page URL and this box shows the last lines the
// swipe hook recorded (touch start/end, why a touch was ignored, browser cancels). Renders nothing otherwise.
import { useEffect, useState } from 'react'
import { swipeTrace } from '@/hooks/useHorizontalSwipe'

export default function SwipeDebugOverlay() {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!swipeTrace.enabled) return
    const fn = () => bump(n => n + 1)
    swipeTrace.listeners.add(fn)
    return () => {
      swipeTrace.listeners.delete(fn)
    }
  }, [])
  if (!swipeTrace.enabled) return null
  return (
    <pre
      className="fixed left-[8px] right-[8px] top-[8px] z-[70] m-0 whitespace-pre-wrap rounded-[8px] p-[8px] text-[11px] leading-[1.3] text-white"
      style={{ background: 'rgba(20,26,40,.85)', pointerEvents: 'none' }}
      aria-hidden
    >
      {`swipe debug · ${navigator.userAgent.replace(/.*(iPhone OS [\d_]+|CPU OS [\d_]+|Android [\d.]+|Chrome\/\d+|Safari\/\d+).*/, '$1')} · ${window.innerWidth}x${window.innerHeight} zoom=${(window.visualViewport?.scale ?? 1).toFixed(2)}\n`}
      {swipeTrace.lines.length ? swipeTrace.lines.join('\n') : '(touch the match list)'}
    </pre>
  )
}
