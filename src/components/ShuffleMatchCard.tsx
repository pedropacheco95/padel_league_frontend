import { useState, useRef, useEffect } from 'react'
import { useTournament } from '@/context/TournamentContext'
import { DIVISION_MULTIPLIERS } from '@/types/tournament'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface Props {
  matchId: string
  gameNumber?: number
}

export default function ShuffleMatchCard({ matchId, gameNumber }: Props) {
  const { state, getPlayerById, submitResult, editResult, removePlayerFromMatchweek } = useTournament()
  const match = state.matches.find(m => m.id === matchId)

  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [editing, setEditing] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [inputRecentlyFocused, setInputRecentlyFocused] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (inputFocused) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      setInputRecentlyFocused(true)
    } else {
      blurTimerRef.current = setTimeout(() => setInputRecentlyFocused(false), 1000)
    }
    return () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current) }
  }, [inputFocused])

  if (!match) return null

  const t1 = match.team1.map(id => getPlayerById(id))
  const t2 = match.team2.map(id => getPlayerById(id))
  const mult = DIVISION_MULTIPLIERS[match.division] || 1
  const removed = match.removedPlayers || []

  const isEditing = !match.played || editing
  const bothFilled = s1 !== '' && s2 !== ''
  const showSave = isEditing && dirty && bothFilled
  const showRed = showSave && !inputRecentlyFocused

  const divLabel = `Div ${match.division} · ×${mult}`
  const headerLabel = gameNumber ? `Jogo ${gameNumber} · ${divLabel}` : divLabel

  function markDirty() {
    setDirty(true)
    setSavedOnce(false)
  }

  function handleSave() {
    const score1 = parseInt(s1)
    const score2 = parseInt(s2)
    if (isNaN(score1) || isNaN(score2)) return
    if (editing) {
      editResult(match.id, score1, score2)
      setEditing(false)
    } else {
      submitResult(match.id, score1, score2)
    }
    setDirty(false)
    setSavedOnce(true)
  }

  function handleEdit() {
    setS1(String(match.score1 ?? ''))
    setS2(String(match.score2 ?? ''))
    setEditing(true)
    setDirty(false)
    setSavedOnce(false)
  }

  function nameStyle(playerId: string): React.CSSProperties {
    if (removed.includes(playerId)) return { textDecoration: 'line-through', opacity: 0.5 }
    if (pendingRemove?.id === playerId) return { color: '#d00000', fontWeight: 700 }
    return {}
  }

  function handlePlayerClick(playerId: string) {
    if (match.played || removed.includes(playerId)) return
    const player = getPlayerById(playerId)
    if (!player) return
    setPendingRemove(prev => prev?.id === playerId ? null : { id: playerId, name: player.name })
  }

  function confirmRemove() {
    if (!pendingRemove) return
    removePlayerFromMatchweek(pendingRemove.id, match.matchweek)
    setPendingRemove(null)
    markDirty()
  }

  // ── View mode (played, not editing) — same structure as LeagueMatchCard ──
  if (match.played && !editing) {
    return (
      <section className="c-tor-box c-tor-box--m">
        <br />
        <div className="c-teams c-teams--double c-teams--vs">
          <div className="c-teams__header c-teams__header--played">
            <div className="c-teams__iandt">
              <span className="big-date">{headerLabel}</span>
              <span className="small-date">{divLabel}</span>
            </div>
            <div className="c-teams__iandt">
              <span>{match.score1}-{match.score2}</span>
            </div>
            <div className="c-teams__iandt">
              <Button
                size="sm"
                onClick={handleEdit}
                className="h-7 px-2 gap-1 bg-white/20 text-white hover:bg-white/30"
              >
                <span className="text-xs">Editar</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="c-teams__box">
          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container">
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__players">
                        <div className="c-teams__name">{t1[0]?.name || '?'}</div>
                        <div className="c-teams__name">{t1[1]?.name || '?'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <span className="c-teams__vs">VS</span>

          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container">
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__players">
                        <div className="c-teams__name">{t2[0]?.name || '?'}</div>
                        <div className="c-teams__name">{t2[1]?.name || '?'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <br />
      </section>
    )
  }

  // ── Edit mode (not yet played, or editing a played match) ──
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
              <span className="big-date">{headerLabel}</span>
              <span className="small-date">{divLabel}</span>
            </div>

            <div className="c-teams__iandt_edit">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="game_results"
                value={s1}
                onChange={e => { setS1(e.target.value.replace(/[^0-9]/g, '')); markDirty() }}
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
                value={s2}
                onChange={e => { setS2(e.target.value.replace(/[^0-9]/g, '')); markDirty() }}
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
                  className="h-7 px-2 gap-1 bg-white text-gray-800 hover:bg-gray-100"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="text-xs">Guardar</span>
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
                  <span className="text-xs">Guardado</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="c-teams__box">
          {/* Team 1 */}
          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container_for_edit">
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__players">
                        <div
                          className="c-teams__name"
                          style={{ ...nameStyle(match.team1[0]), cursor: 'pointer' }}
                          onClick={() => handlePlayerClick(match.team1[0])}
                        >
                          {t1[0]?.name || '?'}
                        </div>
                        <div
                          className="c-teams__name"
                          style={{ ...nameStyle(match.team1[1]), cursor: 'pointer' }}
                          onClick={() => handlePlayerClick(match.team1[1])}
                        >
                          {t1[1]?.name || '?'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <span className="c-teams__vs">VS</span>

          {/* Team 2 */}
          <div className="c-teams__column">
            <ul className="c-teams__list u-list-clean">
              <li className="c-teams__item on_match">
                <div className="c-teams__container_for_edit">
                  <div className="c-teams__details">
                    <div className="l-wrapper">
                      <div className="c-teams__players">
                        <div
                          className="c-teams__name"
                          style={{ ...nameStyle(match.team2[0]), cursor: 'pointer' }}
                          onClick={() => handlePlayerClick(match.team2[0])}
                        >
                          {t2[0]?.name || '?'}
                        </div>
                        <div
                          className="c-teams__name"
                          style={{ ...nameStyle(match.team2[1]), cursor: 'pointer' }}
                          onClick={() => handlePlayerClick(match.team2[1])}
                        >
                          {t2[1]?.name || '?'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <br />
      </section>

      {/* Confirmation modal */}
      {pendingRemove && (
        <div className="gpt_modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <p>
              Tens a certeza que queres tirar{' '}
              <strong>{pendingRemove.name}</strong>{' '}
              desta jornada toda?
            </p>
            <div className="modal-buttons">
              <button onClick={() => setPendingRemove(null)} style={{ backgroundColor: '#ccc' }}>
                Cancelar
              </button>
              <button
                onClick={confirmRemove}
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
