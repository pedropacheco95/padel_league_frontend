// Teams, admins only: a small round WhatsApp button floating at the top of the competition page. One tap
// copies the jornada message the current window offers (lib/teamsShareMessage, unchanged text); then it
// disappears for every admin until the next window opens (Wednesday 00:01 Lisbon). Pedro and Dudas,
// 2 Nov: admins never need to read the message, only copy it. The window, the jornada and the copied
// state live in the backend (GET/POST /competitions/{id}/share-message, services/share_message.py).
import { useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition } from '@/api/v2'
import { resultsApi } from '@/features/results/api'
import { buildTeamsShareMessage } from '@/lib/teamsShareMessage'
import { teamsV2Api } from './api'
import { copyText, shareMessageKey, useShareMessage } from './shareMessage'

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2.2A9.7 9.7 0 0 0 3.7 16.9L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9z" />
      <path d="M16.5 14.2c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.7 1.5.7 2.1.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.3z" />
    </svg>
  )
}

export default function ShareCopyButton({ competition }: { competition: Competition }) {
  const qc = useQueryClient()
  const [hidden, setHidden] = useState(false) // right after a copy, while the POST is on its way
  const share = useShareMessage(competition.id, true)
  const target = share.data?.round ?? null
  const stage = target ? competition.stages.find(s => s.id === target.stageId) : undefined
  const groups = stage?.groups ?? []
  // Prefetched so the text exists before the tap (the clipboard write must not wait for a fetch).
  const matches = useQueries({
    queries: groups.map(g => ({
      queryKey: ['v2', 'groups', g.id, 'matches'],
      queryFn: () => resultsApi.groupMatches(g.id),
    })),
  })
  const mark = useMutation({
    mutationFn: (roundId: number) => teamsV2Api.markShareCopied(competition.id, roundId),
    onSuccess: data => qc.setQueryData(shareMessageKey(competition.id), data),
    onError: () => {
      setHidden(false)
      toast.error('Copiado, mas não ficou registado. Os outros admins ainda veem o botão.')
      qc.invalidateQueries({ queryKey: shareMessageKey(competition.id) })
    },
  })

  if (!target || !stage || share.data?.copied || hidden) return null
  if (groups.length === 0 || matches.some(m => !m.data)) return null

  const message = buildTeamsShareMessage(
    competition.title || competition.label,
    stage.number,
    target.number,
    groups.map((g, i) => ({
      tier: g.tier ?? i + 1,
      matches: (matches[i].data ?? []).filter(m => m.round === target.number && m.status !== 'cancelled'),
    })),
    stage.rounds.find(r => r.number === target.number)?.date,
  )

  const copy = async () => {
    if (!(await copyText(message))) {
      toast.error('Não foi possível copiar. Tenta outra vez.')
      return // the button stays and the window is not marked as copied
    }
    toast.success('Copiado')
    setHidden(true)
    mark.mutate(target.id)
  }

  return (
    <button
      type="button"
      aria-label={`Copiar a mensagem da ${target.number}.ª jornada (WhatsApp)`}
      title={`Copiar a mensagem da ${target.number}.ª jornada`}
      onClick={copy}
      className="fixed right-[12px] z-40 grid h-[36px] w-[36px] place-items-center rounded-full text-white"
      style={{ top: 'calc(env(safe-area-inset-top) + 6px)', background: '#25D366', boxShadow: '0 2px 8px rgba(20,26,40,.25)' }}
    >
      <WhatsAppIcon />
    </button>
  )
}
