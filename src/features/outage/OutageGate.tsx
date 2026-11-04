// Wraps the whole app: a crash while rendering or a confirmed API outage replaces it
// with the "Problemas técnicos" page.
import { Component, useSyncExternalStore, type ReactNode } from 'react'
import { getOutageState, subscribeToOutage } from './outage'
import TechnicalProblems from './TechnicalProblems'

class CrashBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    return this.state.crashed ? <TechnicalProblems /> : this.props.children
  }
}

export default function OutageGate({ children }: { children: ReactNode }) {
  const down = useSyncExternalStore(subscribeToOutage, getOutageState, getOutageState)
  return <CrashBoundary>{down ? <TechnicalProblems /> : children}</CrashBoundary>
}
