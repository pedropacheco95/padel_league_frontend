import type { CompetitionCard } from '@/api/v2'
import { FORMAT_COLOR, formatLabel } from '@/features/competitions/format'

export default function FormatBadge({ competition }: { competition: Pick<CompetitionCard, 'format' | 'formatLabel'> }) {
  return (
    <span
      className="inline-block rounded-full px-[10px] py-[3px] text-[12px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: FORMAT_COLOR[competition.format] ?? '#374151' }}
    >
      {formatLabel(competition)}
    </span>
  )
}
