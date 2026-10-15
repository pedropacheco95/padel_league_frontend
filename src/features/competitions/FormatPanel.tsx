// Teams and Shuffle competition pages embed S4's panels. They are loaded with import.meta.glob so this
// file builds before S4's files are merged; once they exist they are picked up with no change here.
import { Suspense, lazy, type ComponentType } from 'react'
import type { Competition } from '@/api/v2'

type PanelProps = { competition: Competition }
const modules = import.meta.glob<{ default: ComponentType<PanelProps> }>([
  '/src/features/teams/TeamsCompetitionPanel.tsx',
  '/src/features/shuffle/ShuffleCompetitionPanel.tsx',
])

const PATHS: Record<string, string> = {
  teams: '/src/features/teams/TeamsCompetitionPanel.tsx',
  shuffle: '/src/features/shuffle/ShuffleCompetitionPanel.tsx',
}

const cache: Record<string, ComponentType<PanelProps>> = {}
function panelFor(format: string): ComponentType<PanelProps> | null {
  const path = PATHS[format]
  const loader = path ? modules[path] : undefined
  if (!loader) return null
  if (!cache[format]) cache[format] = lazy(loader)
  return cache[format]
}

export function hasFormatPanel(format: string): boolean {
  return format in PATHS
}

export default function FormatPanel({ competition }: PanelProps) {
  const Panel = panelFor(competition.format)
  if (!Panel) return <p className="text-center text-[15px] py-[24px] text-gray-500">Em breve.</p>
  return (
    <Suspense fallback={<div className="loader" />}>
      <Panel competition={competition} />
    </Suspense>
  )
}
