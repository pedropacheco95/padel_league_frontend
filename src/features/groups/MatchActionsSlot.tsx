// S4's result + absence buttons for a match (src/features/results/GroupMatches.tsx, named export MatchActions).
// Loaded with import.meta.glob so this builds before S4's branch is merged; renders nothing until then.
import { Suspense, lazy, type ComponentType } from 'react'
import type { Match } from '@/api/v2'

type Props = { match: Match; roundId?: number }
const modules = import.meta.glob<{ MatchActions?: ComponentType<Props> }>('/src/features/results/GroupMatches.tsx')
const loader = modules['/src/features/results/GroupMatches.tsx']
const Actions = loader
  ? lazy(() => loader().then((m) => ({ default: m.MatchActions ?? ((() => null) as ComponentType<Props>) })))
  : null

export default function MatchActionsSlot(props: Props) {
  if (!Actions) return null
  return (
    <Suspense fallback={null}>
      <Actions {...props} />
    </Suspense>
  )
}
