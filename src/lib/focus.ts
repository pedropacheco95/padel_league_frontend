// Focus ring policy (Pedro, 30 Oct: "remove this blue border from the clicked buttons"): a button keeps
// no ring after a tap or click, but keyboard focus keeps a visible ring. The CSS side is in index.css
// (`:focus:not(:focus-visible)` → no outline). This helper covers browsers that still match
// :focus-visible after a tap: a click with `detail > 0` came from a pointer (keyboard clicks report 0).
import type { MouseEvent } from 'react'

export function blurAfterPointerClick(e: MouseEvent<HTMLElement>) {
  if (e.detail > 0) e.currentTarget.blur()
}
