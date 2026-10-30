// Teams, admin: the round's WhatsApp message. Pedro (30 Oct): after a result is saved it should float
// at the top of the screen as a panel to copy from or close, instead of sitting inline above the
// matches. The text itself is lib/teamsShareMessage, unchanged. A small "Mensagem da jornada" chip
// keeps the panel reachable without saving anything (jornada 1, a re-send); it renders into `openerSlot`
// (the sticky division bar, bug-955: an inline chip sat under the floating jornada pill) when given.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Competition, Stage } from '@/api/v2'
import { resultsApi } from '@/features/results/api'
import { useResultSaved } from '@/features/results/resultSaved'
import { buildTeamsShareMessage } from '@/lib/teamsShareMessage'

const chip = (active: boolean) =>
  `min-h-[40px] whitespace-nowrap rounded-full px-[12px] py-[6px] text-[13px] ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`

/** Copy to the clipboard; when the API is missing or refuses (http, old WebViews), select the text and try
 * the legacy command, leaving the selection in place for a manual copy. Returns whether the copy happened. */
async function copyText(text: string, area: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!area) return false
    area.focus()
    area.select()
    area.setSelectionRange(0, text.length)
    try {
      return document.execCommand('copy')
    } catch {
      return false
    }
  }
}

export default function ShareMessagePanel({ competition, stage, openerSlot }: { competition: Competition; stage: Stage; openerSlot?: HTMLElement | null }) {
  const [round, setRound] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [seenSeq, setSeenSeq] = useState(0)
  const area = useRef<HTMLTextAreaElement>(null)
  const saved = useResultSaved()
  const results = useQueries({
    queries: stage.groups.map(g => ({
      queryKey: ['v2', 'groups', g.id, 'matches'],
      queryFn: () => resultsApi.groupMatches(g.id),
    })),
  })

  // A complete result saved in one of this mini-tournament's divisions opens the panel; closing it keeps
  // it closed until the next save.
  const inStage = !!saved && stage.groups.some(g => g.id === saved.groupId)
  useEffect(() => {
    if (saved && inStage && saved.seq > seenSeq) {
      setSeenSeq(saved.seq)
      setRound(null) // back to the first jornada still to play
      setOpen(true)
    }
  }, [saved, inStage, seenSeq])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (results.some(r => !r.data)) return null
  const all = results.flatMap(r => r.data ?? [])
  const rounds = [...new Set(all.map(m => m.round))].sort((a, b) => a - b)
  if (rounds.length === 0) return null
  const pending = all.filter(m => m.status === 'scheduled').map(m => m.round)
  const active = round ?? (pending.length ? Math.min(...pending) : rounds[rounds.length - 1])
  const message = buildTeamsShareMessage(
    competition.title || competition.label,
    stage.number,
    active,
    stage.groups.map((g, i) => ({
      tier: g.tier ?? i + 1,
      matches: (results[i].data ?? []).filter(m => m.round === active && m.status !== 'cancelled'),
    })),
    stage.rounds.find(r => r.number === active)?.date,
  )
  const copy = async () => {
    if (await copyText(message, area.current)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Não foi possível copiar. Seleciona o texto e copia à mão.')
    }
  }
  const close = () => setOpen(false)

  const opener = openerSlot ? (
    <button
      type="button"
      aria-label="Mensagem da jornada"
      title="Mensagem da jornada"
      aria-expanded={open}
      className="grid h-[40px] w-[40px] place-items-center rounded-full text-gray-800"
      onClick={() => setOpen(true)}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      </svg>
    </button>
  ) : (
    <button className={chip(false)} onClick={() => setOpen(true)}>Mensagem da jornada</button>
  )
  const openerNode = openerSlot ? createPortal(opener, openerSlot) : <div className="mb-[12px]">{opener}</div>
  if (!open) return openerNode
  return (
    <>
    {openerNode}
    <div
      role="dialog"
      aria-label="Mensagem da jornada"
      className="fixed inset-x-0 top-0 z-[60] border-b border-gray-200 bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: '0 6px 18px rgba(20,26,40,.18)' }}
    >
      <div className="mx-auto max-w-[640px] px-[16px] pb-[12px] pt-[8px]">
        <div className="mb-[6px] flex items-center justify-between gap-[8px]">
          <p className="text-[14px] font-semibold">Mensagem da jornada</p>
          <button aria-label="Fechar" title="Fechar" className="min-h-[40px] min-w-[40px] rounded text-[24px] leading-none text-gray-600" onClick={close}>
            ×
          </button>
        </div>
        <div className="mb-[8px] flex flex-wrap gap-[6px]">
          {rounds.map(r => (
            <button key={r} className={chip(r === active)} onClick={() => setRound(r)}>Jornada {r}</button>
          ))}
        </div>
        <textarea
          ref={area}
          readOnly
          value={message}
          rows={9}
          className="block w-full rounded border border-gray-300 p-[8px] text-[13px] leading-[1.35]"
          style={{ maxHeight: '38vh' }}
        />
        <div className="mt-[8px] flex gap-[8px]">
          <button className="min-h-[40px] flex-1 rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white" onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button className="min-h-[40px] rounded border border-gray-300 px-[14px] py-[6px] text-[13px] text-gray-800" onClick={close}>
            Fechar
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
