import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Match } from '@/api/v2'
import { playersApi } from '@/api/players'
import type { PlayerShort } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errorMessage, resultsApi } from './api'
import { participantName } from './matchText'

const UNKNOWN = 'unknown'

/** Mark a player absent for the whole round (every match that week), naming the substitute if known. */
export default function AbsenceDialog({
  match,
  roundId,
  open,
  onOpenChange,
}: {
  match: Match
  roundId: number | undefined
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [playerId, setPlayerId] = useState('')
  const [substitute, setSubstitute] = useState(UNKNOWN)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPlayerId('')
      setSubstitute(UNKNOWN)
      setError(null)
    }
  }, [open])

  // v1 until GET /api/v2/players is served (tracked as a remaining v1 call).
  const players = useQuery({
    queryKey: ['v1', 'players_short'],
    queryFn: async () => (await playersApi.players_short()).data as unknown as PlayerShort[],
    enabled: open,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['v2', 'groups', match.groupId] })
    qc.invalidateQueries({ queryKey: ['v2', 'competitions', match.competitionId, 'standings'] })
  }

  const add = useMutation({
    mutationFn: () =>
      resultsApi.addAbsence(roundId!, {
        playerId: Number(playerId),
        groupId: match.groupId,
        substitutePlayerId: substitute === UNKNOWN ? null : Number(substitute),
      }),
    onSuccess: () => {
      toast.success('Falta registada.')
      refresh()
      onOpenChange(false)
    },
    onError: err => setError(errorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (absenceId: number) => resultsApi.deleteAbsence(absenceId),
    onSuccess: () => {
      toast.success('Falta anulada.')
      refresh()
    },
    onError: err => setError(errorMessage(err)),
  })

  const members = match.participants.filter(p => p.role === 'member' && p.player)
  const absentIds = new Set((match.absences ?? []).map(a => a.player.id))
  const memberIds = new Set(members.map(p => p.player!.id))
  const chosen = members.find(p => String(p.player!.id) === playerId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-[20px]">
        <DialogHeader>
          <DialogTitle className="text-[18px]">Falta à jornada {match.round}</DialogTitle>
        </DialogHeader>

        {(match.absences ?? []).length > 0 && (
          <ul className="mb-[12px] space-y-[6px] text-[14px]">
            {match.absences!.map(a => (
              <li key={a.id} className="flex items-center justify-between gap-[8px] rounded bg-gray-50 px-[10px] py-[6px]">
                <span>
                  <strong>{a.player.name}</strong> faltou{a.kind === 'partial' ? ' (parcial)' : ''} · substituto:{' '}
                  {a.substitute?.name ?? 'desconhecido'}
                </span>
                {a.source === 'recorded' && (
                  <button className="text-[12px] text-red-700 underline" disabled={remove.isPending} onClick={() => remove.mutate(a.id)}>
                    Anular
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-[13px] text-gray-600">Quem faltou? A falta conta para todos os jogos desta jornada.</p>
        <div className="mt-[8px] flex flex-wrap gap-[8px]">
          {members.map(p => {
            const id = String(p.player!.id)
            const done = absentIds.has(p.player!.id)
            return (
              <button
                key={id}
                disabled={done}
                className={`rounded-full border px-[12px] py-[6px] text-[14px] disabled:opacity-40 ${playerId === id ? 'border-red-700 bg-red-700 text-white' : 'border-gray-300'}`}
                onClick={() => setPlayerId(id)}
              >
                {participantName(p)}
              </button>
            )
          })}
        </div>

        <label className="mt-[14px] block text-[13px] text-gray-600">
          Substituto
          <select
            className="mt-[4px] block h-[40px] w-full rounded border border-gray-300 px-[8px] text-[15px] text-gray-900"
            value={substitute}
            onChange={e => setSubstitute(e.target.value)}
          >
            <option value={UNKNOWN}>Desconhecido / sem substituto</option>
            {(players.data ?? [])
              .filter(p => p.id !== null && !memberIds.has(p.id))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
          </select>
        </label>

        {!roundId && <p className="mt-[10px] text-[13px] text-amber-700">Jornada sem identificador; não é possível registar a falta.</p>}
        {error && <p role="alert" className="mt-[10px] text-[13px] text-red-700">{error}</p>}

        <div className="mt-[16px] flex justify-end gap-[8px]">
          <button className="px-[12px] py-[8px] text-[14px] underline" onClick={() => onOpenChange(false)}>Cancelar</button>
          <button
            className="rounded bg-red-700 px-[16px] py-[8px] text-[14px] font-semibold text-white disabled:opacity-40"
            disabled={!chosen || !roundId || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'A registar…' : chosen ? `${participantName(chosen)} não veio` : 'Registar falta'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
