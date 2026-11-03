// The Teams WhatsApp message window, shared by ShareCopyButton and TeamsCompetitionPanel (which keeps
// the sticky bars clear of the button while it shows).
import { useQuery } from '@tanstack/react-query'
import { teamsV2Api } from './api'

export const shareMessageKey = (competitionId: number) => ['v2', 'competitions', competitionId, 'share-message']

/** The window's state (admins only; disabled otherwise). */
export function useShareMessage(competitionId: number, enabled: boolean) {
  return useQuery({
    queryKey: shareMessageKey(competitionId),
    queryFn: () => teamsV2Api.shareMessage(competitionId),
    enabled,
    refetchInterval: 5 * 60 * 1000, // another admin's copy, or the Wednesday window, shows up without a reload
    refetchOnWindowFocus: true,
  })
}

/** Clipboard API first (inside the tap, before any await, for iOS); else a hidden textarea +
 * execCommand('copy'). Resolves to whether the text reached the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.readOnly = true
    area.setAttribute('aria-hidden', 'true')
    Object.assign(area.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' })
    document.body.appendChild(area)
    try {
      area.focus()
      area.select()
      area.setSelectionRange(0, text.length)
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}
