import { Component, type ReactNode } from 'react'

/** Contains a failed lazy chunk (e.g. stale after a deploy) so it never blanks the whole page. */
export default class ChunkBoundary extends Component<{ fallback?: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[v2] lazy section failed', error)
  }
  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children
  }
}
