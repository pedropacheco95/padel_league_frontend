// When the API is down nothing crashes: the pages just stay empty. A failed request is
// not proof of that (one endpoint can break alone), so it only triggers a probe of a
// plain public read, and the site is down when that probe fails too.
import axios from 'axios'

const PROBE_URL = '/api/v2/competitions'

let down = false
let probing: Promise<void> | null = null
const listeners = new Set<() => void>()

export const subscribeToOutage = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getOutageState = () => down

export const isServerFailure = (error: unknown) => {
  if (axios.isCancel(error)) return false
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === undefined || status >= 500
}

export function reportServerFailure() {
  if (down || probing || !navigator.onLine) return
  probing = axios
    .get(PROBE_URL)
    .catch((error) => {
      if (!isServerFailure(error)) return
      down = true
      listeners.forEach((listener) => listener())
    })
    .then(() => {
      probing = null
    })
}
