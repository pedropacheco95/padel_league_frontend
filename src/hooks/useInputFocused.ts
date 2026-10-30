// True while a text field has the focus: on iOS Safari the on-screen keyboard rides a `position: fixed`
// element up the screen, so floating chrome (the jornada pill) hides itself while the user types.
import { useEffect, useState } from 'react'

const FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function isTextField(el: Element | null): boolean {
  return !!el && (FIELDS.has(el.tagName) || el.getAttribute('contenteditable') === 'true')
}

export function useInputFocused(): boolean {
  const [focused, setFocused] = useState(() => (typeof document === 'undefined' ? false : isTextField(document.activeElement)))
  useEffect(() => {
    // On focusout the document's activeElement is already the body; the element gaining focus (if any)
    // is the event's relatedTarget.
    const onIn = (e: FocusEvent) => setFocused(isTextField(e.target as Element | null))
    const onOut = (e: FocusEvent) => setFocused(isTextField(e.relatedTarget as Element | null))
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
  }, [])
  return focused
}
