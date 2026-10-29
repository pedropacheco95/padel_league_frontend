// The pre-16-Oct "Editar jogos" card (EditableMatchCard) rebuilt on /api/v2, as Pedro asked: the
// result is typed in the teal header bar of the match itself, Guardar appears once there is something
// valid to save and the bar turns red ("por guardar") until it is; the pairs are photos + names, tap a
// player → red ✕ → "ele não veio" (SeatPanel: who played instead, this match or the jornada). Teams
// saves set by set (the card is the "continuar"). Signed-out visitors get the same card read-only.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Match, Participant, ResultInput } from '@/api/v2'
import { errorMessage, resultsApi } from './api'
import AbsenceDialog from './AbsenceDialog'
import { groupMatchesKey, seatKey, type SeatKey } from './keys'
import { matchAbsences, participantName, sideParticipants } from './matchText'
import { initials, sameDraft, serverDraft, setsFor, setsTally, shortDate, type Draft } from './resultDraft'
import { buildResult, buildWalkover, isPartialInput, setInProgress, teamsSetPoints, TEAMS_SETS, walkoverAbsentees } from './resultInput'
import { SeatPanel } from './SeatControls'

const TEAL = '#006A71' // $color-primary
const DIRTY_RED = '#d00000' // the old card's "unsaved" bar
const PILL = '#FF6B6B' // the old card's selected-name pill
const X_OVERLAY = 'rgba(238, 0, 0, 0.75)' // the old card's ✕ over the photo
const LIGHT = '#eef3f4' // $color-light
const DARK = '#281e1e' // $color-dark
const FIELD = '#2b7f85' // the score fields: a lighter teal than the bar (Pedro's reference, 29 Oct)
const DEFAULT_PHOTO = '/static/images/Player/default_player.jpg'
const scoreBoxClass = 'flex h-[40px] w-[30px] items-center justify-center rounded-[5px] text-center text-[18px] font-bold text-white'
const scoreInputClass = `${scoreBoxClass} border-0 p-0 outline-none focus:ring-2 focus:ring-white disabled:opacity-40`
const tiny = 'text-[9px] font-semibold uppercase tracking-[0.08em] leading-none opacity-90'

export default function ResultCard({
  match,
  roundId,
  roundMatches,
  roundDate,
  editable,
}: {
  match: Match
  roundId?: number
  /** the jornada's date, shown when the match has no time of its own */
  roundDate?: string | null
  /** the jornada's matches of this group, when the caller has them (whole-jornada absences) */
  roundMatches?: Match[]
  /** signed in, match not cancelled, group open (or admin) */
  editable: boolean
}) {
  const teams = match.format === 'teams'
  const n = setsFor(match)
  const server = serverDraft(match)
  const [draft, setDraft] = useState<Draft>(server)
  const [woAbsent, setWoAbsent] = useState<number | 'both' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingSeat, setPendingSeat] = useState<SeatKey | null>(null)
  const [panelSeat, setPanelSeat] = useState<SeatKey | null>(null)
  const [more, setMore] = useState(false)
  const [woOpen, setWoOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const card = useRef<HTMLElement>(null)
  const prevServer = useRef(server)
  const qc = useQueryClient()

  // Follow the saved match only while the user has not typed: a seat change mid-entry (refetch) must
  // not wipe the games already typed, and a failed save keeps them too.
  const signature = JSON.stringify([match.status, match.winner, match.sets])
  useEffect(() => {
    const next = serverDraft(match)
    const prev = prevServer.current
    prevServer.current = next
    setDraft(cur => (sameDraft(cur, prev) ? next : cur))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const dirty = editable && !sameDraft(draft, server)
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current) }, [])

  const refresh = (saved: Match) => {
    qc.setQueriesData<Match[]>({ queryKey: groupMatchesKey(match.groupId) }, old => old?.map(m => (m.id === saved.id ? saved : m)))
    qc.invalidateQueries({ queryKey: ['v2', 'groups', match.groupId] })
    qc.invalidateQueries({ queryKey: ['v2', 'group', match.groupId] }) // the group page's cache
    qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'v2' && q.queryKey[1] === 'competitions' && q.queryKey[3] === 'standings' })
  }

  const save = useMutation({
    // A walkover first records the no-shows as absent for the round (they lose the presence; whoever
    // of the losing pair came keeps it), then the result.
    mutationFn: async ({ input, absentees }: { input: ResultInput; absentees: number[] }) => {
      for (const playerId of absentees) await resultsApi.addAbsence(roundId!, { playerId, groupId: match.groupId })
      return resultsApi.putResult(match.id, input)
    },
    onSuccess: saved => {
      refresh(saved)
      setDraft(serverDraft(saved))
      setWoAbsent(null)
      setWoOpen(false)
      setMore(false)
      setSavedOnce(true)
      toast.success(saved.inProgress ? `Guardado: ${saved.sets.length === 1 ? '1 set' : `${saved.sets.length} sets`}. Falta o resto.` : 'Resultado guardado.')
    },
    onError: err => setError(errorMessage(err)),
  })

  // A result saved on the wrong match (e.g. a jornada not played yet): back to "por jogar".
  const clear = useMutation({
    mutationFn: () => resultsApi.clearResult(match.id),
    onSuccess: saved => {
      refresh(saved)
      setDraft(serverDraft(saved))
      setConfirmClear(false)
      setMore(false)
      setSavedOnce(false)
      toast.success('Resultado apagado. O jogo volta a estar por jogar.')
    },
    onError: err => setError(errorMessage(err)),
  })

  const hasResult = match.status === 'played' || match.status === 'walkover' || !!match.inProgress
  const built = draft.walkover ? ({ ok: true, input: buildWalkover(draft.walkover) } as const) : buildResult(match.format, draft.sets, draft.timeoutAt)
  const partial = teams && built.ok && !draft.walkover && isPartialInput(built.input)
  const alreadyAbsent = (match.absences ?? []).map(a => a.player.id)
  const losers = draft.walkover
    ? match.participants.filter(p => p.side !== draft.walkover && p.role === 'member' && p.player && !alreadyAbsent.includes(p.player.id))
    : []
  const needsAbsent = !!draft.walkover && losers.length > 0 && woAbsent === null
  const canSave = dirty && built.ok && !needsAbsent && !save.isPending
  const showRed = canSave && !focused
  const preview = teams && built.ok && !draft.walkover ? teamsSetPoints(built.input) : null
  const points: [number, number] | null =
    dirty && preview ? preview : match.homeScore != null && match.awayScore != null ? [match.homeScore, match.awayScore] : teams && preview && hasResult ? preview : null
  const date = shortDate(match.scheduledAt ?? roundDate)
  const typedSets = built.ok && !draft.walkover ? built.input.sets : match.sets
  const tally = typedSets.length ? setsTally(typedSets) : null
  const [home, away] = sideParticipants(match)
  const absences = matchAbsences(match)

  const setGame = (i: number, side: 'home' | 'away', v: string) => {
    if (v !== '' && !/^\d{1,2}$/.test(v)) return
    setDraft(d => ({ ...d, sets: d.sets.map((s, k) => (k === i ? { ...s, [side]: v } : s)) }))
    setError(null)
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
    e.currentTarget.select()
  }
  const onBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 250)
  }
  // Enter / "next" on the phone keyboard: the following score box of this card, Done on the last one.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const inputs = Array.from(card.current?.querySelectorAll<HTMLInputElement>('input[data-score]') ?? []).filter(i => !i.disabled)
    const next = inputs[inputs.indexOf(e.currentTarget) + 1]
    if (next) next.focus()
    else e.currentTarget.blur()
  }

  const submit = () => {
    if ('error' in built) return setError(built.error)
    let absentees: number[] = []
    if (draft.walkover && losers.length > 0) {
      if (woAbsent === null) return setError('Indica quem faltou da dupla que perdeu por falta de comparência.')
      if (!roundId) return setError('Jornada sem identificador; não é possível registar a falta.')
      absentees = walkoverAbsentees(match.participants, draft.walkover, woAbsent, alreadyAbsent)
    }
    save.mutate({ input: built.input, absentees })
  }
  const cancel = () => {
    setDraft(server)
    setWoAbsent(null)
    setError(null)
  }

  const tap = (p: Participant) => {
    if (!editable) return
    const key = seatKey(p)
    if (p.role === 'member') {
      setPanelSeat(null)
      setPendingSeat(s => (s === key ? null : key))
    } else {
      setPendingSeat(null)
      setPanelSeat(s => (s === key ? null : key))
    }
  }
  const remove = (p: Participant) => {
    setPendingSeat(null)
    setPanelSeat(seatKey(p))
  }

  const scoreBox = (i: number, side: 'home' | 'away', last: boolean) => {
    const label = `${teams ? `Set ${i + 1}` : 'Jogos'} ${side === 'home' ? 'casa' : 'fora'}`
    if (!editable) {
      const set = match.sets.find(x => x.setNo === i + 1)
      const v = set?.outcome === 'not_started' ? '—' : (side === 'home' ? set?.homeGames : set?.awayGames) ?? ''
      return <span aria-label={label} className={scoreBoxClass} style={{ background: FIELD }}>{v}</span>
    }
    const notStarted = draft.timeoutAt !== null && i > draft.timeoutAt
    return (
      <input
        data-score
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint={last ? 'done' : 'next'}
        className={scoreInputClass}
        style={{ background: FIELD }}
        value={notStarted ? '' : draft.sets[i][side]}
        placeholder={notStarted ? '—' : ''}
        disabled={notStarted || save.isPending}
        onChange={e => setGame(i, side, e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKey}
      />
    )
  }
  const setPair = (i: number) => (
    <span className="flex items-center gap-[2px]">
      {scoreBox(i, 'home', false)}
      <span className="w-[6px] text-center text-[13px] font-bold">-</span>
      {scoreBox(i, 'away', i === n - 1)}
    </span>
  )

  const photo = (p: Participant) => {
    const key = seatKey(p)
    const pending = pendingSeat === key
    const member = p.role === 'member'
    const url = member && p.player?.pictureUrl && !p.player.pictureUrl.endsWith(DEFAULT_PHOTO) ? p.player.pictureUrl : null
    return (
      <span className="relative inline-block shrink-0">
        <button
          type="button"
          disabled={!editable}
          onClick={() => tap(p)}
          aria-label={member ? `Tirar ${participantName(p)} deste jogo` : `Quem jogou no lugar de ${p.replaces?.name ?? 'substituto'}`}
          className="flex h-[59px] w-[59px] items-center justify-center rounded-full bg-cover bg-center text-[18px] font-bold"
          style={{ backgroundImage: url ? `url(${url})` : undefined, backgroundColor: url ? undefined : '#d7e6e7', color: TEAL, border: `3px solid ${TEAL}`, backgroundPositionY: 'top' }}
        >
          {!url && (member ? initials(p.player?.name) : '?')}
        </button>
        {pending && member && (
          <button
            type="button"
            onClick={() => remove(p)}
            aria-label={`${participantName(p)} não veio`}
            className="absolute inset-0 flex items-center justify-center rounded-full text-[26px] font-black leading-none text-white"
            style={{ background: X_OVERLAY }}
          >
            ✕
          </button>
        )}
      </span>
    )
  }

  const name = (p: Participant, won: boolean) => {
    const key = seatKey(p)
    const pending = pendingSeat === key || panelSeat === key
    const member = p.role === 'member'
    return (
      <button
        type="button"
        disabled={!editable}
        onClick={() => tap(p)}
        className={`max-w-full truncate rounded-[5px] px-[6px] text-[16px] font-semibold leading-[1.35] ${won ? 'underline decoration-2 underline-offset-2' : ''} ${member ? '' : 'italic'}`}
        style={pending ? { backgroundColor: PILL, color: 'white' } : { color: DARK }}
      >
        {participantName(p)}
        {!member && <span className={`ml-[4px] text-[11px] not-italic ${pending ? 'text-white' : 'text-gray-500'}`}>{p.replaces ? `por ${p.replaces.name}` : 'substituto'}</span>}
      </button>
    )
  }

  const pair = (ps: readonly Participant[], side: 'home' | 'away') => {
    const won = !dirty && match.winner === side
    const [a, b] = ps
    return (
      <div className="flex items-center justify-between gap-[4px] rounded-[30px] px-[6px] py-[4px]" style={{ background: LIGHT }}>
        {a && photo(a)}
        <div className="flex min-w-0 flex-1 flex-col items-center">
          {a && name(a, won)}
          {b && name(b, won)}
        </div>
        {b && photo(b)}
      </div>
    )
  }

  const setTag = (i: number) => {
    if (draft.timeoutAt === i) return <>Set {i + 1}<span className="block text-[10px] font-normal text-amber-200">TE</span></>
    return <>Set {i + 1}</>
  }
  const guardarLabel = save.isPending ? 'A guardar…' : partial && built.ok ? `Guardar ${built.input.sets.length} set${built.input.sets.length > 1 ? 's' : ''}` : 'Guardar'
  const sides = (['home', 'away'] as const).map(s => [s, s === 'home' ? 'casa' : 'fora'] as const)
  const panel = panelSeat ? match.participants.find(p => seatKey(p) === panelSeat) : undefined

  return (
    <section ref={card} className="overflow-hidden rounded-[8px] bg-white shadow-[0_0_6px_1px_rgba(0,0,0,0.1)]" aria-label={`Jogo ${match.id}`}>
      {/* The header bar (Pedro's reference, 29 Oct): date | SET 1·2·3 fields | SETS tally; a red row
          with Guardar appears under it while there is a result to save. */}
      <div className="text-white transition-colors" style={{ backgroundColor: showRed ? DIRTY_RED : TEAL }}>
        <div className="flex items-center gap-[5px] px-[8px] py-[6px]">
          <div className="shrink-0 text-center leading-tight">
            <div className={tiny}>Jornada {match.round}</div>
            {date && <div className="mt-[3px] text-[11px] font-bold">{date}</div>}
          </div>
          <span className="mx-[4px] h-[36px] w-px shrink-0 bg-white/30" aria-hidden />
          {draft.walkover ? (
            <div className="flex flex-1 items-center justify-center text-[15px] font-bold">W.O. · vitória {draft.walkover === 'home' ? 'casa' : 'fora'}</div>
          ) : (
            <div className="flex flex-1 items-end justify-center gap-[4px]">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="flex flex-col items-center gap-[3px]">
                  <span className={`${tiny} ${draft.timeoutAt === i ? 'text-amber-200' : ''}`}>{teams ? `Set ${i + 1}${draft.timeoutAt === i ? ' TE' : ''}` : 'Jogos'}</span>
                  {setPair(i)}
                </span>
              ))}
            </div>
          )}
          {teams && (
            <>
              <span className="mx-[4px] h-[36px] w-px shrink-0 bg-white/30" aria-hidden />
              <div className="flex shrink-0 flex-col items-center leading-none">
                <span className={`${tiny} ${!dirty && match.inProgress ? 'text-amber-300' : ''}`}>{!dirty && match.inProgress ? 'em curso' : 'Sets'}</span>
                <span className="mt-[3px] text-[20px] font-bold tabular-nums">
                  {draft.walkover ? 'W.O.' : tally ? `${tally[0]} – ${tally[1]}` : '— – —'}
                </span>
              </div>
            </>
          )}
        </div>
        {editable && canSave && (
          <div className="flex items-center justify-between gap-[8px] border-t border-white/25 px-[8px] py-[4px]">
            <span className={tiny}>por guardar</span>
            <button type="button" onClick={submit} className="min-h-[32px] rounded-[4px] bg-white px-[12px] text-[13px] font-bold text-gray-900 shadow-sm">
              {guardarLabel}
            </button>
          </div>
        )}
        {editable && save.isPending && <div className="px-[8px] pb-[4px] text-right text-[12px]">A guardar…</div>}
      </div>

      {editable && dirty && !focused && 'error' in built && (
        <p className="px-[10px] pt-[6px] text-[12px] text-red-700">{built.error}</p>
      )}
      {error && <p role="alert" className="px-[10px] pt-[6px] text-[12px] text-red-700">{error}</p>}

      {/* The pairs: photo | names | photo, VS between them (the old c-teams box). */}
      <div className="px-[8px] pt-[8px]">
        {pair(home, 'home')}
        <div className="py-[2px] text-center text-[17px] font-semibold" style={{ color: TEAL }}>VS</div>
        {pair(away, 'away')}
        {panel && (
          <SeatPanel
            key={`${panelSeat}-${panel.player?.id ?? 'x'}`}
            match={match}
            seat={panel}
            roundId={roundId}
            roundMatches={roundMatches}
            onClose={() => setPanelSeat(null)}
          />
        )}
      </div>

      {absences.length > 0 && (
        <p className="px-[10px] pt-[6px] text-[12px] text-amber-800">
          Faltas: {absences.map(a => `${a.player.name} (${a.substitute?.name ?? 'substituto desconhecido'})`).join(', ')}
        </p>
      )}

      <div className="flex min-h-[32px] items-center gap-[10px] px-[10px] py-[4px] text-[12px] text-gray-500">
        {editable && dirty && (
          <button type="button" className="min-h-[32px] underline" onClick={cancel} disabled={save.isPending}>
            Cancelar
          </button>
        )}
        {editable && !dirty && savedOnce && <span className="font-semibold text-emerald-700">Guardado</span>}
        {points && (
          <span className="ml-auto tabular-nums">
            Pontos{dirty && partial ? ' até agora' : ''}: {points[0]} – {points[1]}
          </span>
        )}
        {editable && (
          <button
            type="button"
            className={`min-h-[32px] px-[4px] ${points ? '' : 'ml-auto'}`}
            aria-expanded={more}
            onClick={() => setMore(m => !m)}
          >
            Mais {more ? '▴' : '▾'}
          </button>
        )}
      </div>

      {editable && more && (
        <div className="border-t border-gray-100 px-[10px] py-[8px] text-[13px]">
          <div className="flex flex-wrap gap-[8px]">
            {teams && !draft.walkover && draft.timeoutAt === null && (
              <button
                type="button"
                className="min-h-[36px] rounded border border-amber-600 px-[10px] text-amber-800"
                onClick={() => setDraft(d => ({ ...d, timeoutAt: setInProgress(d.sets) }))}
              >
                Tempo esgotado
              </button>
            )}
            {teams && !draft.walkover && draft.timeoutAt !== null && (
              <label className="flex min-h-[36px] items-center text-gray-700">
                Tempo esgotado no
                <select
                  className="ml-[6px] min-h-[36px] rounded border border-gray-300 px-[6px]"
                  value={draft.timeoutAt}
                  onChange={e => setDraft(d => ({ ...d, timeoutAt: Number(e.target.value) }))}
                >
                  {Array.from({ length: TEAMS_SETS }, (_, i) => <option key={i} value={i}>set {i + 1}</option>)}
                </select>
                <button type="button" className="ml-[6px] px-[6px] underline" onClick={() => setDraft(d => ({ ...d, timeoutAt: null }))}>
                  Anular
                </button>
              </label>
            )}
            {teams && (
              <button
                type="button"
                className={`min-h-[36px] rounded border px-[10px] ${woOpen || draft.walkover ? 'border-gray-900' : 'border-gray-300'}`}
                aria-expanded={woOpen || !!draft.walkover}
                onClick={() => setWoOpen(o => !o)}
              >
                W.O.
              </button>
            )}
            <button type="button" className="min-h-[36px] rounded border border-gray-300 px-[10px]" onClick={() => setAbsenceOpen(true)}>
              Falta na jornada
            </button>
            {hasResult && !confirmClear && (
              <button type="button" className="min-h-[36px] px-[4px] text-red-700 underline" onClick={() => setConfirmClear(true)}>
                Apagar resultado
              </button>
            )}
          </div>
          {teams && (woOpen || draft.walkover) && (
            <div className="mt-[8px]">
              <p className="text-gray-600">Falta de comparência: quem ganha?</p>
              <div className="mt-[6px] flex flex-wrap gap-[8px]">
                {sides.map(([side, label]) => (
                  <button
                    key={side}
                    type="button"
                    className={`min-h-[36px] rounded border px-[10px] ${draft.walkover === side ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300'}`}
                    onClick={() => {
                      setDraft(d => ({ ...d, walkover: d.walkover === side ? null : side }))
                      setWoAbsent(null)
                    }}
                  >
                    Vitória {label}
                  </button>
                ))}
              </div>
              {draft.walkover && losers.length > 0 && (
                <div className="mt-[8px]">
                  <p className="text-gray-700">Quem faltou? Quem veio mantém a presença.</p>
                  <div className="mt-[6px] flex flex-wrap gap-[8px]" role="radiogroup" aria-label="Quem faltou">
                    {[...losers.map(p => [p.player!.id, p.player!.name] as const), ['both', 'Faltaram os dois'] as const].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={woAbsent === value}
                        className={`min-h-[36px] rounded-full border px-[12px] ${woAbsent === value ? 'border-red-700 bg-red-700 text-white' : 'border-gray-300'}`}
                        onClick={() => setWoAbsent(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {confirmClear && (
            <div className="mt-[8px] rounded border border-red-200 bg-red-50 p-[10px]">
              <p>Apagar o resultado deste jogo? Fica por jogar e a classificação é recalculada.</p>
              <div className="mt-[8px] flex justify-end gap-[8px]">
                <button type="button" className="min-h-[36px] px-[10px] underline" onClick={() => setConfirmClear(false)}>Não</button>
                <button
                  type="button"
                  className="min-h-[36px] rounded bg-red-700 px-[12px] font-semibold text-white disabled:opacity-40"
                  disabled={clear.isPending}
                  onClick={() => clear.mutate()}
                >
                  {clear.isPending ? 'A apagar…' : 'Sim, apagar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {editable && <AbsenceDialog match={match} roundId={roundId} open={absenceOpen} onOpenChange={setAbsenceOpen} />}
    </section>
  )
}
