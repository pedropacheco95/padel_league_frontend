import { useState, useEffect, useRef } from 'react'
import { Match, PlayerShort } from '@/types'
import { matchesApi } from '@/api/matches'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

type SlotKey = 'homeplayer0' | 'homeplayer1' | 'awayplayer0' | 'awayplayer1'

interface Props {
  match: Match
  onSaved?: () => void
  onDirtyChange?: (dirty: boolean) => void
  onPlayerEliminated?: (playerId: number, matchweek: number) => void
  externalEliminated?: number[]
}

const SUB_PLAYER: PlayerShort = {
  id: null,
  name: 'Substituto',
  fullName: 'Jogador substituto',
  pictureUrl: '/static/images/Player/default_player.jpg',
  rankingPoints: 0,
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  )
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'N def'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export default function EditableMatchCard({
  match,
  onSaved,
  onDirtyChange,
  onPlayerEliminated,
  externalEliminated = [],
}: Props) {
  const [homeGames, setHomeGames] = useState(
    match.gamesHomeTeam != null ? String(match.gamesHomeTeam) : ''
  )
  const [awayGames, setAwayGames] = useState(
    match.gamesAwayTeam != null ? String(match.gamesAwayTeam) : ''
  )
  const [pendingSlot, setPendingSlot] = useState<SlotKey | null>(null)
  const [confirmSlot, setConfirmSlot] = useState<SlotKey | null>(null)
  const [eliminated, setEliminated] = useState<Set<SlotKey>>(new Set())
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [inputRecentlyFocused, setInputRecentlyFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (inputFocused) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      setInputRecentlyFocused(true)
    } else {
      blurTimerRef.current = setTimeout(() => setInputRecentlyFocused(false), 1000)
    }
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [inputFocused])

  const slotPlayers: Record<SlotKey, PlayerShort> = {
    homeplayer0: match.homePlayers[0],
    homeplayer1: match.homePlayers[1],
    awayplayer0: match.awayPlayers[0],
    awayplayer1: match.awayPlayers[1],
  }

  const bothScoresFilled = homeGames !== '' && awayGames !== ''
  const showSave = dirty && bothScoresFilled
  const showRed = showSave && !inputRecentlyFocused

  function markDirty() {
    setDirty(true)
    setSavedOnce(false)
    onDirtyChange?.(true)
  }

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function isSlotEliminated(slot: SlotKey): boolean {
    if (eliminated.has(slot)) return true
    const pid = slotPlayers[slot].id
    if (!pid) return false
    return externalEliminated.includes(pid)
  }

  function getPhoto(slot: SlotKey): string {
    if (isSlotEliminated(slot) || !slotPlayers[slot].id) return SUB_PLAYER.pictureUrl!
    return slotPlayers[slot].pictureUrl ?? SUB_PLAYER.pictureUrl!
  }

  function handlePlayerClick(slot: SlotKey) {
    if (isSlotEliminated(slot) || !slotPlayers[slot].id) return
    setPendingSlot(prev => (prev === slot ? null : slot))
  }

  function handleXClick() {
    if (!pendingSlot) return
    setConfirmSlot(pendingSlot)
    setPendingSlot(null)
  }

  function handleConfirm() {
    if (!confirmSlot) return
    const playerId = slotPlayers[confirmSlot].id!
    setEliminated(prev => new Set([...prev, confirmSlot]))
    setConfirmSlot(null)
    markDirty()
    onPlayerEliminated?.(playerId, match.matchweek)
  }

  function handleCancelModal() {
    setPendingSlot(null)
    setConfirmSlot(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await matchesApi.editMatch(match.id, {
        homeGames: homeGames !== '' ? Number(homeGames) : (match.gamesHomeTeam ?? 0),
        awayGames: awayGames !== '' ? Number(awayGames) : (match.gamesAwayTeam ?? 0),
        field: match.field ?? 'Campo 1',
        playersEliminated: Array.from(eliminated).map(slot => ({
          slot,
          playerId: slotPlayers[slot].id!,
        })),
      })
      setDirty(false)
      setSavedOnce(true)
      onDirtyChange?.(false)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  function renderPlayerSlot(slot: SlotKey) {
    const isPending = pendingSlot === slot
    const isElim = isSlotEliminated(slot)
    const isClickable = !isElim && !!slotPlayers[slot].id

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div
          className="c-teams__img u-img-cropped u-img-cropped--team"
          style={{
            backgroundImage: `url(${getPhoto(slot)})`,
            cursor: isClickable ? 'pointer' : 'default',
          }}
          onClick={() => isClickable && handlePlayerClick(slot)}
        />
        {isPending && (
          <div
            onClick={handleXClick}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(180, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              ✕
            </span>
          </div>
        )}
      </div>
    )
  }

  const confirmPlayerName = confirmSlot
    ? slotPlayers[confirmSlot].fullName || slotPlayers[confirmSlot].name
    : ''

  const hp0 = match.homePlayers[0]
  const hp1 = match.homePlayers[1]
  const ap0 = match.awayPlayers[0]
  const ap1 = match.awayPlayers[1]

  function nameStyle(slot: SlotKey): React.CSSProperties {
    if (isSlotEliminated(slot)) return { textDecoration: 'line-through', opacity: 0.5 }
    if (pendingSlot === slot) return { color: '#d00000', fontWeight: 700 }
    return {}
  }

  return (
    <>
      <section className="c-tor-box c-tor-box--m">
        <br />
        <div className="c-teams c-teams--double c-teams--vs">
          <div
            className="c-teams__header c-teams__header--played"
            style={{ backgroundColor: showRed ? '#d00000' : undefined }}
          >
            <div className="c-teams__iandt_edit">
              <img className="small_watch" src="/static/images/watch.png" alt="" />
              <span className="big-date">{formatDateFull(match.dateHour)}</span>
              <span className="small-date">{formatDateShort(match.dateHour)}</span>
            </div>

            <div className="c-teams__iandt_edit">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="game_results"
                value={homeGames}
                onChange={e => { setHomeGames(e.target.value.replace(/[^0-9]/g, '')); markDirty() }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={{ width: '3rem', textAlign: 'center' }}
              />
              <span>-</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="game_results"
                value={awayGames}
                onChange={e => { setAwayGames(e.target.value.replace(/[^0-9]/g, '')); markDirty() }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={{ width: '3rem', textAlign: 'center' }}
              />
            </div>

            <div className="c-teams__iandt_submit">
              {showSave && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-7 px-2 gap-1 bg-white text-gray-800 hover:bg-gray-100"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="sm:inline text-xs">{saving ? '…' : 'Guardar'}</span>
                </Button>
              )}
              {!showSave && savedOnce && (
                <Button
                  size="sm"
                  disabled
                  className="h-7 px-2 gap-1 text-white"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.3019607843)' }}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="sm:inline text-xs">Guardado</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="c-teams__box">
          {/* Home team */}
          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container_for_edit">
                  <div className="l-wrapper">{renderPlayerSlot('homeplayer0')}</div>
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__score">{hp0.rankingPoints + hp1.rankingPoints}</div>
                      <div className="c-teams__players">
                        <div className="c-teams__name" style={nameStyle('homeplayer0')}>{hp0.fullName}</div>
                        <div className="c-teams__name" style={nameStyle('homeplayer1')}>{hp1.fullName}</div>
                        <div className="c-teams__name_small" style={nameStyle('homeplayer0')}>{hp0.name}</div>
                        <div className="c-teams__name_small" style={nameStyle('homeplayer1')}>{hp1.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="l-wrapper">{renderPlayerSlot('homeplayer1')}</div>
                </div>
              </li>
            </ul>
          </div>

          <span className="c-teams__vs">VS</span>

          {/* Away team */}
          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container_for_edit">
                  <div className="l-wrapper">{renderPlayerSlot('awayplayer0')}</div>
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__score">{ap0.rankingPoints + ap1.rankingPoints}</div>
                      <div className="c-teams__players">
                        <div className="c-teams__name" style={nameStyle('awayplayer0')}>{ap0.fullName}</div>
                        <div className="c-teams__name" style={nameStyle('awayplayer1')}>{ap1.fullName}</div>
                        <div className="c-teams__name_small" style={nameStyle('awayplayer0')}>{ap0.name}</div>
                        <div className="c-teams__name_small" style={nameStyle('awayplayer1')}>{ap1.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="l-wrapper">{renderPlayerSlot('awayplayer1')}</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <br />
      </section>

      {/* Flask-style confirmation modal */}
      {confirmSlot && (
        <div className="gpt_modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <p>
              Tens a certeza que queres tirar{' '}
              <strong>{confirmPlayerName}</strong>{' '}
              desta jornada toda?
            </p>
            <div className="modal-buttons">
              <button onClick={handleCancelModal} style={{ backgroundColor: '#ccc' }}>
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                style={{ backgroundColor: '#e74c3c', color: 'white' }}
              >
                Sim, ele não veio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
