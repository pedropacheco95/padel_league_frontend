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
import { useAuth } from '@/context/AuthContext'
import { groupMatchesKey, seatKey, type SeatKey } from './keys'
import { matchAbsences, participantName, sideParticipants } from './matchText'
import { initials, roundNight, sameDraft, serverDraft, setsFor, setsTally, shortDate, shortTime, type Draft } from './resultDraft'
import { buildResult, buildWalkover, isPartialInput, teamsSetPoints, type Side } from './resultInput'
import { SeatPanel } from './SeatControls'

const TEAL = '#006A71' // $color-primary
const DIRTY_RED = '#d00000' // the old card's "unsaved" bar
const PILL = '#FF6B6B' // the old card's selected-name pill
const X_OVERLAY = 'rgba(238, 0, 0, 0.75)' // the old card's ✕ over the photo
const LIGHT = '#eef3f4' // $color-light
const DARK = '#281e1e' // $color-dark
const FIELD = '#2b7f85' // the score fields: a lighter teal than the bar (Pedro's reference, 29 Oct)
const DIRTY_FIELD = '#dc3838' // the same lightness step up from the red bar while there is a result to save
const DEFAULT_PHOTO = '/static/images/Player/default_player.jpg'
const scoreBoxClass = 'flex h-[40px] items-center justify-center rounded-[5px] text-center text-[18px] font-bold text-white'
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
  const [error, setError] = useState<string | null>(null)
  const [pendingSeat, setPendingSeat] = useState<SeatKey | null>(null)
  const [panelSeat, setPanelSeat] = useState<SeatKey | null>(null)
  const [more, setMore] = useState(false)
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin) // Apagar resultado is for admins (Pedro, 29 Oct)
  const [confirmClear, setConfirmClear] = useState(false)
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

  // W.O. from the absence panel (Pedro, 29 Oct): a pair with both seats empty (nobody came, no
  // substitute named) loses by walkover to a pair with at least one player; there is nothing to type.
  // Both pairs empty: no W.O., the bar says so. Only while no set has been saved or typed.
  const present = (side: Side) => match.participants.filter(p => p.side === side && p.player).length
  const untouched = match.sets.length === 0 && draft.sets.every(x => x.home.trim() === '' && x.away.trim() === '')
  const autoWo: Side | null =
    teams && untouched && match.status !== 'walkover'
      ? present('away') === 0 && present('home') > 0 ? 'home' : present('home') === 0 && present('away') > 0 ? 'away' : null
      : null
  const nobody = teams && untouched && match.status === 'scheduled' && present('home') === 0 && present('away') === 0
  const walkover = draft.walkover ?? autoWo
  const typed = !sameDraft(draft, server)
  const dirty = editable && (typed || (autoWo !== null && server.walkover !== autoWo))
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
    mutationFn: (input: ResultInput) => resultsApi.putResult(match.id, input),
    onSuccess: saved => {
      refresh(saved)
      setDraft(serverDraft(saved))
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
  const built = walkover ? ({ ok: true, input: buildWalkover(walkover) } as const) : buildResult(match.format, draft.sets, draft.timeoutAt)
  const partial = teams && built.ok && !walkover && isPartialInput(built.input)
  const canSave = dirty && built.ok && !save.isPending
  const showRed = canSave && !focused
  const field = showRed ? DIRTY_FIELD : FIELD
  const preview = teams && built.ok && !walkover ? teamsSetPoints(built.input) : null
  const points: [number, number] | null =
    dirty && preview ? preview : match.homeScore != null && match.awayScore != null ? [match.homeScore, match.awayScore] : teams && preview && hasResult ? preview : null
  // The bar's date: the match's own time, else the jornada's date, else the night the jornada's
  // other matches are scheduled for (the first rule of lib/teamsShareMessage's dateLabel).
  const date = shortDate(match.scheduledAt ?? roundDate ?? roundNight(roundMatches))
  const time = shortTime(match.scheduledAt) // the match's own time only; a jornada date has none
  const typedSets = built.ok && !walkover ? built.input.sets : match.sets
  // The set time ran out in: derived from a non-terminal score as typed (shown before saving), else
  // the saved result's. Later sets are not played.
  const builtTe = built.ok && !walkover ? built.input.sets.findIndex(x => x.outcome === 'timeout_draw') : -1
  const teAt = builtTe >= 0 ? builtTe : built.ok ? null : draft.timeoutAt
  const teDerived = teAt !== null && draft.timeoutAt !== teAt
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
    save.mutate(built.input)
  }
  const cancel = () => {
    setDraft(server)
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

  const fieldW = teams ? 'w-[30px]' : 'w-[36px]' // three pairs must fit a 390px bar; a single pair keeps the old 3rem
  const scoreBox = (i: number, side: 'home' | 'away', last: boolean) => {
    const label = `${teams ? `Set ${i + 1}` : 'Jogos'} ${side === 'home' ? 'casa' : 'fora'}`
    if (!editable) {
      const set = match.sets.find(x => x.setNo === i + 1)
      const v = set?.outcome === 'not_started' ? '—' : (side === 'home' ? set?.homeGames : set?.awayGames) ?? ''
      return <span aria-label={label} className={`${scoreBoxClass} ${fieldW}`} style={{ background: field }}>{v}</span>
    }
    const notStarted = teAt !== null && i > teAt
    return (
      <input
        data-score
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint={last ? 'done' : 'next'}
        className={`${scoreInputClass} ${fieldW}`}
        style={{ background: field }}
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
        className={`max-w-full truncate rounded-[5px] px-[6px] text-[16px] font-semibold leading-[1.35] ${member ? '' : 'italic'}`}
        // Winner marker (Pedro, 30 Oct): the winning pair's names in the card's teal, same weight, no underline.
        style={pending ? { backgroundColor: PILL, color: 'white' } : { color: won ? TEAL : DARK }}
        data-won={won || undefined}
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
    if (teAt === i) return <>Set {i + 1}<span className="block text-[10px] font-normal text-amber-200">TE</span></>
    return <>Set {i + 1}</>
  }
  const guardarLabel = save.isPending ? 'A guardar…' : walkover ? 'Guardar W.O.' : partial && built.ok ? `Guardar ${built.input.sets.length} set${built.input.sets.length > 1 ? 's' : ''}` : 'Guardar'
  const sides = (['home', 'away'] as const).map(s => [s, s === 'home' ? 'casa' : 'fora'] as const)
  const panel = panelSeat ? match.participants.find(p => seatKey(p) === panelSeat) : undefined

  return (
    <section ref={card} className="overflow-hidden rounded-[8px] bg-white shadow-[0_0_6px_1px_rgba(0,0,0,0.1)]" aria-label={`Jogo ${match.id}`}>
      {/* The header bar (Pedro's reference, 29 Oct): date | SET 1·2·3 fields | SETS tally; a red row
          with Guardar appears under it while there is a result to save. */}
      <div className="text-white transition-colors" style={{ backgroundColor: showRed ? DIRTY_RED : TEAL }}>
        <div className="flex items-center gap-[5px] px-[8px] py-[6px]">
          {/* The date, as the reference, with the time and the court (what people look up on match
              night) tiny underneath, one per line so the Teams bar still fits 390px; the jornada hint
              (already the filter above the list) only when there is neither. */}
          <div className="shrink-0 text-center leading-tight">
            {date && !time && !match.court && <div className={`${tiny} mb-[3px]`}>Jornada {match.round}</div>}
            <div className="text-[11px] font-bold">{date ?? `Jornada ${match.round}`}</div>
            {time && <div className={`${tiny} mt-[3px]`}>{time}</div>}
            {match.court && <div className={`${tiny} mt-[3px] normal-case`}>{match.court}</div>}
          </div>
          <span className="mx-[4px] h-[36px] w-px shrink-0 bg-white/30" aria-hidden />
          {match.status === 'cancelled' ? (
            <div className="flex flex-1 items-center justify-center text-[15px] font-bold">Cancelado</div>
          ) : walkover ? (
            <div className="flex flex-1 items-center justify-center text-[15px] font-bold">W.O. · vitória {walkover === 'home' ? 'casa' : 'fora'}</div>
          ) : nobody ? (
            <div className="flex flex-1 items-center justify-center text-center text-[13px] font-semibold leading-tight">Ninguém compareceu · sem resultado</div>
          ) : (
            <div className="flex flex-1 items-end justify-center gap-[4px]">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="flex flex-col items-center gap-[3px]">
                  <span className={`${tiny} ${teAt === i ? 'text-amber-200' : ''}`}>{teams ? `Set ${i + 1}${teAt === i ? ' TE' : ''}` : 'Jogos'}</span>
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
                  {walkover ? 'W.O.' : tally ? `${tally[0]} – ${tally[1]}` : '— – —'}
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
      {editable && teDerived && teAt !== null && built.ok && (
        <p className="px-[10px] pt-[6px] text-[12px] text-amber-800">
          Set {teAt + 1}: {built.input.sets[teAt].homeGames}-{built.input.sets[teAt].awayGames} não é um set completo, fica como tempo esgotado (1 ponto para cada dupla); os sets seguintes ficam por jogar.
        </p>
      )}
      {editable && autoWo && dirty && (
        <p className="px-[10px] pt-[6px] text-[12px] text-amber-800">
          A dupla {autoWo === 'home' ? 'de fora' : 'da casa'} não compareceu: guarda a falta de comparência (3 sets para quem veio). Enganaste-te? Toca na foto e "Afinal X jogou".
        </p>
      )}

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
        {editable && typed && (
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
        {editable && isAdmin && hasResult && (
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

      {/* Admin only (Pedro, 29 Oct): a result saved on the wrong match goes back to "por jogar". W.O.,
          tempo esgotado and faltas are not buttons here: they follow from the result and from the players. */}
      {editable && isAdmin && hasResult && more && (
        <div className="border-t border-gray-100 px-[10px] py-[8px] text-[13px]">
          {!confirmClear && (
            <button type="button" className="min-h-[36px] px-[4px] text-red-700 underline" onClick={() => setConfirmClear(true)}>
              Apagar resultado
            </button>
          )}
          {confirmClear && (
            <div className="rounded border border-red-200 bg-red-50 p-[10px]">
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
    </section>
  )
}
