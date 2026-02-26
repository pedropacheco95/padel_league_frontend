import { useState, useEffect } from 'react'
import { useTournament } from '@/context/TournamentContext'
import { DIVISION_MULTIPLIERS, Match } from '@/types/tournament'
import { useAuth } from '@/context/AuthContext'
import LeagueMatchCard from '@/components/LeagueMatchCard'
import EditableMatchCard, { EditableCardPlayer } from '@/components/EditableMatchCard'
import { Shuffle, Zap } from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'standings' | 'matches' | 'divisions'

const DIV_BADGE: Record<number, { color: string; bg: string; headerBg: string }> = {
  1: { color: '#7a5800', bg: '#fff0b0', headerBg: '#c8960a' },
  2: { color: '#2d3748', bg: '#e8edf2', headerBg: '#718096' },
  3: { color: '#7a3100', bg: '#ffebd8', headerBg: '#c06020' },
  4: { color: '#003380', bg: '#dbeafe', headerBg: '#2563eb' },
  5: { color: '#145a32', bg: '#d1fae5', headerBg: '#16a34a' },
  6: { color: '#581c87', bg: '#ede9fe', headerBg: '#7c3aed' },
}

function orderMatches(matches: Match[]): Match[] {
  const byDiv = new Map<number, Match[]>()
  matches.forEach(m => {
    if (!byDiv.has(m.division)) byDiv.set(m.division, [])
    byDiv.get(m.division)!.push(m)
  })
  const result: Match[] = []
  byDiv.forEach(divMatches => {
    const teamSet = new Map<string, [string, string]>()
    divMatches.forEach(m => {
      const k1 = m.team1.join(',')
      const k2 = m.team2.join(',')
      if (!teamSet.has(k1)) teamSet.set(k1, m.team1)
      if (!teamSet.has(k2)) teamSet.set(k2, m.team2)
    })
    const teams = Array.from(teamSet.entries())
    const schedule = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
    const ordered: Match[] = []
    for (const [a, b] of schedule) {
      const ta = teams[a]?.[0]
      const tb = teams[b]?.[0]
      if (!ta || !tb) continue
      const found = divMatches.find(m => {
        const k1 = m.team1.join(',')
        const k2 = m.team2.join(',')
        return (k1 === ta && k2 === tb) || (k1 === tb && k2 === ta)
      })
      if (found) ordered.push(found)
    }
    divMatches.forEach(m => { if (!ordered.includes(m)) ordered.push(m) })
    result.push(...ordered)
  })
  return result
}

const TEST_NAMES = [
  'Carlos García','Miguel Torres','Pablo Ruiz','Alejandro López','Javier Martín',
  'Daniel Sánchez','Fernando Díaz','Andrés Moreno','Diego Hernández','Rafael Jiménez',
  'Sergio Romero','Álvaro Navarro','Iván Domínguez','Hugo Vázquez','Marcos Gil',
  'Adrián Molina','Óscar Ortega','Rubén Delgado','Jorge Ramos','Luis Prieto',
  'Manuel Blanco','Víctor Castro','Pedro Méndez','Antonio Guerrero','Roberto Peña',
  'Tomás Medina','Eduardo Santos','Raúl Iglesias','Nicolás Crespo','Gabriel Flores',
  'Mario Ferrer','Enrique Cabrera','David Suárez','Samuel Herrera','Martín Aguilar',
  'Alberto Pascual','Santiago Cortés','Felipe Caballero','Ricardo Campos','Gonzalo León',
  'Ignacio Vega','Emilio Fuentes','Bruno Reyes','Lucas Carrasco','Mateo Gallego',
  'Jaime Nieto','Arturo Pardo','Cristian Lara',
]

export default function ShufflePage() {
  const { user } = useAuth()
  const {
    state,
    addPlayer,
    calculateDivisions,
    generateMatchweek,
    getDivisionForPlayer,
    getPlayerById,
    submitResult,
    editResult,
    removePlayerFromMatchweek,
  } = useTournament()

  const [activeTab, setActiveTab] = useState<Tab>('standings')
  const [selectedDivision, setSelectedDivision] = useState(1)
  const [matchesDivFilter, setMatchesDivFilter] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [dirtyMatches, setDirtyMatches] = useState<Set<string>>(new Set())

  // Auto-load 48 test players on mount if empty
  useEffect(() => {
    if (state.players.length === 0) {
      TEST_NAMES.forEach(name => addPlayer(name))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCalculateDivisions = () => {
    if (state.players.length !== 48) { toast.error('Precisas de exactamente 48 jogadores'); return }
    calculateDivisions()
    toast.success('Divisões recalculadas!')
  }

  const handleGenerateMatchweek = () => {
    if (state.divisions.length === 0) { toast.error('Calcula as divisões primeiro'); return }
    generateMatchweek()
    toast.success(`Jornada ${state.currentMatchweek + 1} gerada!`)
  }

  const currentMatches = state.matches.filter(m => m.matchweek === state.currentMatchweek)

  function tabClass(tab: Tab) {
    return `c-tor-header__item${activeTab === tab ? ' c-tor-header__item--active' : ''}`
  }

  function tabContentClass(tab: Tab) {
    return `${activeTab === tab ? ' is-visible' : ''}`
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.points - a.points)
  const anyDirty = dirtyMatches.size > 0

  function handleDirtyChange(matchId: string, dirty: boolean) {
    setDirtyMatches(prev => {
      const alreadyDirty = prev.has(matchId)
      if (dirty === alreadyDirty) return prev
      const next = new Set(prev)
      if (dirty) next.add(matchId)
      else next.delete(matchId)
      return next
    })
  }

  function handleToggleEdit() {
    if (editMode && anyDirty) {
      if (!window.confirm('Tens alterações não guardadas. Queres mesmo sair do modo de edição?')) {
        return
      }
    }
    setEditMode(prev => !prev)
    setDirtyMatches(new Set())
  }

  function getMatchPlayers(match: Match) {
    const toCardPlayer = (id: string): EditableCardPlayer => {
      const player = getPlayerById(id)
      return {
        id,
        name: player?.name || '?',
        fullName: player?.name || '?',
        pictureUrl: '/static/images/Player/default_player.jpg',
        rankingPoints: 0,
      }
    }

    return {
      homePlayers: [toCardPlayer(match.team1[0]), toCardPlayer(match.team1[1])] as [
        EditableCardPlayer,
        EditableCardPlayer,
      ],
      awayPlayers: [toCardPlayer(match.team2[0]), toCardPlayer(match.team2[1])] as [
        EditableCardPlayer,
        EditableCardPlayer,
      ],
    }
  }

  function renderShuffleMatchCard(match: Match, gameNumber: number) {
    const mult = DIVISION_MULTIPLIERS[match.division] || 1
    const divLabel = `Div ${match.division} · x${mult}`
    const headerLabel = `Jogo ${gameNumber} · ${divLabel}`
    const players = getMatchPlayers(match)
    const isEditing = !!user && editMode

    if (!isEditing) {
      return (
        <LeagueMatchCard
          homeTeam={{ players: players.homePlayers }}
          awayTeam={{ players: players.awayPlayers }}
          scoreHome={match.score1 ?? null}
          scoreAway={match.score2 ?? null}
          headerPrimary={headerLabel}
          headerSecondary={divLabel}
          showWatchIcon={false}
          showFieldInfo={false}
          playerHrefResolver={() => null}
        />
      )
    }

    return (
      <EditableMatchCard
        match={{
          id: match.id,
          dateHour: null,
          gamesHomeTeam: match.score1 ?? null,
          gamesAwayTeam: match.score2 ?? null,
          field: null,
          matchweek: match.matchweek,
          homePlayers: players.homePlayers,
          awayPlayers: players.awayPlayers,
        }}
        headerPrimary={headerLabel}
        headerSecondary={divLabel}
        showWatchIcon={false}
        externalEliminated={match.removedPlayers || []}
        onDirtyChange={dirty => handleDirtyChange(match.id, dirty)}
        onSaved={() => handleDirtyChange(match.id, false)}
        onPlayerEliminated={(playerId, matchweek) =>
          removePlayerFromMatchweek(String(playerId), matchweek)
        }
        onSave={({ homeGames, awayGames }) => {
          if (match.played) editResult(match.id, homeGames, awayGames)
          else submitResult(match.id, homeGames, awayGames)
        }}
      />
    )
  }

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content" style={{ width: '100%' }}>
          <div className="c-tor-header__title">Padel Shuffle</div>
          <div className="c-tor-header__iandt">
            <span>Jornada {state.currentMatchweek}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
            <button onClick={handleCalculateDivisions} className="c-btn c-btn--small" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <Shuffle className="h-4 w-4" /> Reagrupar
            </button>
            <button onClick={handleGenerateMatchweek} className="c-btn c-btn--small" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <Zap className="h-4 w-4" /> Gerar Jornada
            </button>
          </div>

          <ul className="c-tor-header__nav u-list-clean" role="tablist">
            <li className={tabClass('standings')} role="presentation">
              <a onClick={() => setActiveTab('standings')}>Classificação</a>
            </li>
            <li className={tabClass('matches')} role="presentation">
              <a onClick={() => setActiveTab('matches')}>Jogos</a>
            </li>
            <li className={tabClass('divisions')} role="presentation">
              <a onClick={() => setActiveTab('divisions')}>Divisões</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="l-grid">
        {/* ---- Standings tab ---- */}
        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('standings')}`} id="shuffle_standings_tab">
          {state.players.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              A carregar jogadores...
            </div>
          ) : (
            <table id="classification_table" className="classification_table">
              <thead>
                <tr>
                  <th />
                  <th />
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>JG</th>
                  <th>JP</th>
                  <th>Pts</th>
                  <th style={{width: '10%'}}>Div</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => {
                  const div = getDivisionForPlayer(player.id)
                  const badge = DIV_BADGE[div]
                  return (
                    <tr key={player.id} className="player_classification_row">
                      <td>{idx + 1}</td>
                      <td>{player.name}</td>
                      <td>{player.wins}</td>
                      <td>{player.draws}</td>
                      <td>{player.losses}</td>
                      <td>{player.gamesWon}</td>
                      <td>{player.gamesLost}</td>
                      <td>{player.points}</td>
                      <td>
                        {div > 0 ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            color: badge?.color || '#333',
                            backgroundColor: badge?.bg || '#eee',
                          }}>
                            Div {div}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ---- Matches tab ---- */}
        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('matches')}`} id="shuffle_matches_tab">
          <div style={{ position: 'relative' }}>
            {user && (
              <div
                style={{
                  position: 'absolute',
                  right: '-1rem',
                  top: '-2rem',
                  background: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                <span style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1 }}>Editar Jogos</span>
                <button
                  onClick={handleToggleEdit}
                  aria-pressed={editMode}
                  style={{
                    border: 0,
                    borderRadius: '999px',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer',
                    background: editMode ? '#198754' : '#adb5bd',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {editMode ? 'ON' : 'OFF'}
                </button>
              </div>
            )}

            {state.divisions.length > 0 && (
              <div className="select_container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <select
                  className="form-select matchweek_select"
                  value={matchesDivFilter}
                  onChange={e => setMatchesDivFilter(Number(e.target.value))}
                >
                  <option value={0}>Todas as divisões</option>
                  {state.divisions.map(d => (
                    <option key={d.number} value={d.number}>Divisão {d.number}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {currentMatches.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Gera uma jornada para ver os jogos
            </div>
          ) : (
            <div className="l-grid l-grid--tor">
              {orderMatches(
                currentMatches.filter(m => matchesDivFilter === 0 || m.division === matchesDivFilter)
              ).map((match, idx) => (
                <span key={match.id}>{renderShuffleMatchCard(match, idx + 1)}</span>
              ))}
            </div>
          )}

          {state.currentMatchweek > 1 && (
            <>
              <br />
              {Array.from({ length: state.currentMatchweek - 1 }, (_, i) => i + 1)
                .reverse()
                .map(mw => {
                  const mwMatches = state.matches.filter(
                    m => m.matchweek === mw && (matchesDivFilter === 0 || m.division === matchesDivFilter)
                  )
                  return (
                    <details key={mw} style={{ marginBottom: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '8px 0' }}>
                        Jornada {mw} ({mwMatches.filter(m => m.played).length}/{mwMatches.length} jogados)
                      </summary>
                      <div className="l-grid l-grid--tor">
                        {orderMatches(mwMatches).map((match, idx) => (
                          <span key={match.id}>{renderShuffleMatchCard(match, idx + 1)}</span>
                        ))}
                      </div>
                    </details>
                  )
                })}
            </>
          )}
        </div>

        {/* ---- Divisions tab ---- */}
        <div className={`c-flex-table--tab ${tabContentClass('divisions')}`} id="shuffle_divisions_tab">
          {state.divisions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Calcula as divisões primeiro
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {state.divisions.map(d => (
                  <button
                    key={d.number}
                    onClick={() => setSelectedDivision(d.number)}
                    className="c-btn c-btn--small"
                    style={{
                      cursor: 'pointer',
                      fontWeight: selectedDivision === d.number ? 700 : 400,
                      opacity: selectedDivision === d.number ? 1 : 0.6,
                    }}
                  >
                    Divisão {d.number}
                  </button>
                ))}
              </div>

              {(() => {
                const div = state.divisions.find(d => d.number === selectedDivision)
                if (!div) return null
                const mult = DIVISION_MULTIPLIERS[selectedDivision] || 1
                const divPlayers = div.playerIds
                  .map(id => state.players.find(p => p.id === id))
                  .filter(Boolean)
                  .sort((a, b) => b!.points - a!.points)

                return (
                  <>
                    <div className='c-flex-table--shuffle-games c-flex-table c-flex-table--ranking'>
                      <table className="classification_table">
                        <thead>
                          <tr>
                            <th />
                            <th />
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>JG</th>
                            <th>JP</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divPlayers.map((player, idx) => (
                            <tr key={player!.id} className="player_classification_row">
                              <td>{idx + 1}</td>
                              <td>{player!.name}</td>
                              <td>{player!.wins}</td>
                              <td>{player!.draws}</td>
                              <td>{player!.losses}</td>
                              <td>{player!.gamesWon}</td>
                              <td>{player!.gamesLost}</td>
                              <td>{player!.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ margin: '1rem', fontSize: '1.5rem', opacity: 0.8 }}>
                        Vitória: <strong>{3 * mult} pts</strong> · Empate: <strong>{1 * mult} pts</strong> · Multiplicador: ×{mult}
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </>
  )
}
