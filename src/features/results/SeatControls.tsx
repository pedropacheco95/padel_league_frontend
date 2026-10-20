// "Ele não veio", per player, inside the result modal: the legacy EditableMatchCard flow (tap the
// player, tap the red ✕, confirm "Sim, ele não veio"), now per match and with an optional named
// substitute. Works before and after the result is saved; it saves at once, apart from Guardar.
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Match, Participant } from '@/api/v2'
import { errorMessage, resultsApi } from './api'
import { groupMatchesKey } from './keys'
import { participantName } from './matchText'


const UNKNOWN = 'unknown'
const DEFAULT_PHOTO = '/static/images/Player/default_player.jpg' // as the legacy EditableMatchCard

/** One player of the scoreboard's name column. A member: tap → red pill + ✕ → confirm.
 * A substitute (or unknown) seat: tap → change who played, or put the member back. */
export function SeatButton({
  p,
  pending,
  disabled,
  onTap,
  onRemove,
}: {
  p: Participant
  pending: boolean
  disabled?: boolean
  onTap: () => void
  onRemove: () => void
}) {
  const member = p.role === 'member'
  const photo = member ? p.player?.pictureUrl || DEFAULT_PHOTO : DEFAULT_PHOTO
  return (
    <div className="flex min-h-[40px] items-center gap-[6px]">
      <button
        type="button"
        disabled={disabled}
        onClick={onTap}
        aria-label={member ? `Tirar ${participantName(p)} deste jogo` : `Quem jogou no lugar de ${p.replaces?.name ?? 'substituto'}`}
        className="flex min-h-[40px] min-w-0 flex-1 items-center gap-[8px] rounded-[8px] py-[2px] pr-[6px] text-left"
        style={pending ? { backgroundColor: '#FF6B6B', color: 'white' } : undefined}
      >
        <span
          className="h-[30px] w-[30px] shrink-0 rounded-full bg-gray-200 bg-cover bg-center"
          style={{ backgroundImage: `url(${photo})` }}
          aria-hidden
        />
        <span className={`min-w-0 text-[14px] leading-tight ${member ? '' : 'italic opacity-85'}`}>
          <span className="block truncate">{participantName(p)}</span>
          {!member && (
            <span className={`block truncate text-[11px] ${pending ? 'text-white' : 'text-gray-500'}`}>
              {p.replaces ? `por ${p.replaces.name}` : 'substituto'}
            </span>
          )}
        </span>
      </button>
      {pending && member && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${participantName(p)} não veio`}
          className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full text-[20px] font-black leading-none text-white"
          style={{ background: 'rgba(238, 0, 0, 0.85)' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

/** The confirmation under the scoreboard (the legacy "Tens a certeza…?" modal, inline). */
export function SeatPanel({
  match,
  seat,
  roundId,
  roundMatches,
  onClose,
}: {
  match: Match
  seat: Participant
  roundId?: number
  /** the other matches of the jornada, when known: decides whether "a jornada toda" is offered */
  roundMatches?: Match[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const member = seat.role === 'member'
  const name = participantName(seat)
  const playerId = seat.player?.id ?? null
  const others = roundMatches?.filter(m => m.id !== match.id && m.participants.some(p => p.player?.id === playerId)) ?? []
  // Teams: one match per pair per jornada, so "this match" is the jornada. Unknown (Clássica group
  // page): offer both, defaulting to the legacy "jornada toda".
  const canRound = member && !!roundId && (roundMatches ? others.length > 0 : match.format !== 'teams')
  const [scope, setScope] = useState<'match' | 'round'>(canRound ? 'round' : 'match')
  const [substitute, setSubstitute] = useState(member ? UNKNOWN : seat.player ? String(seat.player.id) : UNKNOWN)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setError(null), [scope, substitute])

  const players = useQuery({ queryKey: ['v2', 'players'], queryFn: resultsApi.players })
  const inMatch = new Set(match.participants.map(p => p.player?.id).filter(Boolean))
  // Group members can't be substitutes (the server refuses): the jornada's members, when known.
  const members = new Set(
    (roundMatches ?? [match]).flatMap(m => m.participants.filter(p => p.role === 'member').map(p => p.player?.id)).filter(Boolean),
  )
  const options = (players.data ?? [])
    .filter(p => p.id !== null && (!inMatch.has(p.id) || p.id === seat.player?.id) && !members.has(p.id) && p.id !== seat.replaces?.id)
    .sort((a, b) => a.name.localeCompare(b.name))
  const subId = substitute === UNKNOWN ? null : Number(substitute)

  const refresh = (saved?: Match) => {
    if (saved) qc.setQueriesData<Match[]>({ queryKey: groupMatchesKey(match.groupId) }, old => old?.map(m => (m.id === saved.id ? saved : m)))
    qc.invalidateQueries({ queryKey: ['v2', 'groups', match.groupId] })
    qc.invalidateQueries({ queryKey: ['v2', 'group', match.groupId] }) // S3's group page cache
    qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'v2' && q.queryKey[1] === 'competitions' && q.queryKey[3] === 'standings' })
  }

  const save = useMutation({
    mutationFn: async (action: 'out' | 'sub' | 'back') => {
      if (action === 'out' && scope === 'round') {
        await resultsApi.addAbsence(roundId!, { playerId: playerId!, groupId: match.groupId, substitutePlayerId: subId })
        return undefined
      }
      const target = action === 'back' ? seat.replaces!.id : subId
      return resultsApi.putSlot(match.id, { side: seat.side, slot: seat.slot, playerId: target })
    },
    onSuccess: (saved, action) => {
      refresh(saved)
      toast.success(
        action === 'out'
          ? `${name} saiu ${scope === 'round' ? 'da jornada' : 'do jogo'}.`
          : action === 'back'
            ? `${seat.replaces!.name} voltou ao jogo.`
            : 'Substituto guardado.',
      )
      onClose()
    },
    onError: err => setError(errorMessage(err)),
  })

  const select = (
    <label className="mt-[10px] block text-[13px] text-gray-700">
      {member ? 'Quem jogou no lugar dele?' : 'Quem jogou?'}
      <select
        className="mt-[4px] block h-[40px] w-full rounded border border-gray-300 bg-white px-[8px] text-[15px] text-gray-900"
        value={substitute}
        onChange={e => setSubstitute(e.target.value)}
      >
        <option value={UNKNOWN}>Jogador substituto (não sei quem)</option>
        {options.map(p => (
          <option key={p.id} value={String(p.id)}>{p.name}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="mt-[12px] rounded-lg border border-red-200 bg-red-50 p-[12px] text-[14px]" role="group" aria-label={`Jogador: ${name}`}>
      {member ? (
        <>
          <p>
            Tens a certeza que queres tirar <strong>{name}</strong> {scope === 'round' ? 'desta jornada toda' : 'deste jogo'}?
          </p>
          {match.status !== 'scheduled' && (
            <p className="mt-[4px] text-[12px] text-gray-600">O resultado mantém-se; {name} perde os pontos e a presença deste jogo.</p>
          )}
          {canRound && (
            <div className="mt-[8px] flex flex-wrap gap-[8px]" role="radiogroup" aria-label="Faltou a">
              {(['match', 'round'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={scope === s}
                  onClick={() => setScope(s)}
                  className={`min-h-[40px] rounded-full border px-[12px] py-[6px] text-[13px] ${scope === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'}`}
                >
                  {s === 'match' ? 'Só este jogo' : 'A jornada toda'}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p>
          {seat.replaces ? (
            <>Lugar de <strong>{seat.replaces.name}</strong>, que não veio.</>
          ) : (
            <>Lugar de um jogador que não veio.</>
          )}
        </p>
      )}
      {select}
      {error && <p role="alert" className="mt-[8px] text-[13px] text-red-700">{error}</p>}
      <div className="mt-[12px] flex flex-wrap justify-end gap-[8px]">
        <button type="button" className="min-h-[40px] rounded px-[12px] py-[8px] text-[14px]" style={{ backgroundColor: '#ccc' }} onClick={onClose} disabled={save.isPending}>
          Cancelar
        </button>
        {!member && seat.replaces && (
          <button
            type="button"
            className="min-h-[40px] rounded border border-gray-900 bg-white px-[12px] py-[8px] text-[14px] font-semibold"
            disabled={save.isPending}
            onClick={() => save.mutate('back')}
          >
            Afinal {seat.replaces.name} jogou
          </button>
        )}
        {member ? (
          <button
            type="button"
            className="min-h-[40px] rounded px-[14px] py-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#e74c3c' }}
            disabled={save.isPending || !playerId}
            onClick={() => save.mutate('out')}
          >
            {save.isPending ? 'A remover…' : 'Sim, ele não veio'}
          </button>
        ) : (
          <button
            type="button"
            className="min-h-[40px] rounded bg-gray-900 px-[14px] py-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
            disabled={save.isPending || subId === (seat.player?.id ?? null)}
            onClick={() => save.mutate('sub')}
          >
            {save.isPending ? 'A guardar…' : 'Guardar substituto'}
          </button>
        )}
      </div>
    </div>
  )
}
