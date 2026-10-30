// A slot inside PageHeader's gradient block where a page body can place a control (the Teams/Shuffle
// stage switcher) through a portal, so hero and control share ONE background: no seam, one angle.
import { useEffect, useState } from 'react'

export const HEADER_SLOT_ID = 'v2-header-slot'

/** The slot element, once the header is in the DOM (null where there is no PageHeader, e.g. tests). */
export function useHeaderSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById(HEADER_SLOT_ID)), [])
  return slot
}
