// A complete result was just saved (ResultCard). Listeners that live elsewhere on the page (the Teams
// jornada message panel) react without the card knowing about them. Module-level on purpose: the
// card and the panel sit in different subtrees of the competition page.
import { useSyncExternalStore } from 'react'

export type ResultSaved = { seq: number; groupId: number; matchId: number }

let last: ResultSaved | null = null
const listeners = new Set<() => void>()

export function emitResultSaved(event: Omit<ResultSaved, 'seq'>) {
  last = { ...event, seq: (last?.seq ?? 0) + 1 }
  listeners.forEach(l => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const read = () => last

/** The latest complete result saved on this page, or null. `seq` grows by one per save. */
export function useResultSaved(): ResultSaved | null {
  return useSyncExternalStore(subscribe, read, read)
}

/** Tests only. */
export function resetResultSaved() {
  last = null
}
