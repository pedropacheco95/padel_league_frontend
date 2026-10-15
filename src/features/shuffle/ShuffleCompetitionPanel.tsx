// Shuffle competition page body, embedded by S3's /competitions/:id (contract: default export, props { competition }).
import type { Competition } from '@/api/v2'

export default function ShuffleCompetitionPanel({ competition }: { competition: Competition }) {
  return <p className="pb-[32px] text-[15px] text-gray-600">Shuffle: {competition.name} (em construção).</p>
}
