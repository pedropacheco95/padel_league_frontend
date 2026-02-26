import { useState, useEffect } from 'react'
import { useTournament } from '@/context/TournamentContext'
import { DIVISION_MULTIPLIERS, Match } from '@/types/tournament'
import ShuffleMatchCard from '@/components/ShuffleMatchCard'
import { Shuffle, Zap } from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'standings' | 'matches' | 'divisions'

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
  const {
    state, addPlayer, calculateDivisions, generateMatchweek, getDivisionForPlayer,
  } = useTournament()

  const [activeTab, setActiveTab] = useState<Tab>('standings')
  const [selectedDivision, setSelectedDivision] = useState(1)
  const [matchesDivFilter, setMatchesDivFilter] = useState(0)

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
    return `c-flex-table c-flex-table--ranking${activeTab === tab ? ' is-visible' : ''}`
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.points - a.points)

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content" style={{ width: '100%' }}>
          <div className="c-tor-header__title">Padel Shuffle</div>
          <div className="c-tor-header__iandt">
            <span>{state.players.length}/48 jogadores · Jornada {state.currentMatchweek}</span>
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
        <div className={tabContentClass('standings')} id="shuffle_standings_tab">
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
                  <th className="optional_table_columns">V</th>
                  <th className="optional_table_columns">E</th>
                  <th className="optional_table_columns">D</th>
                  <th className="optional_table_columns">JG</th>
                  <th className="optional_table_columns">JP</th>
                  <th>Pts</th>
                  <th>Div</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => {
                  const div = getDivisionForPlayer(player.id)
                  return (
                    <tr key={player.id} className="player_classification_row">
                      <td>{idx + 1}</td>
                      <td>{player.name}</td>
                      <td className="optional_table_columns">{player.wins}</td>
                      <td className="optional_table_columns">{player.draws}</td>
                      <td className="optional_table_columns">{player.losses}</td>
                      <td className="optional_table_columns">{player.gamesWon}</td>
                      <td className="optional_table_columns">{player.gamesLost}</td>
                      <td>{player.points}</td>
                      <td>{div > 0 ? div : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ---- Matches tab ---- */}
        <div className={tabContentClass('matches')} id="shuffle_matches_tab">
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

          {currentMatches.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Gera uma jornada para ver os jogos
            </div>
          ) : (
            <div className="l-grid l-grid--tor">
              {orderMatches(
                currentMatches.filter(m => matchesDivFilter === 0 || m.division === matchesDivFilter)
              ).map((match, idx) => (
                <ShuffleMatchCard key={match.id} matchId={match.id} gameNumber={idx + 1} />
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
                          <ShuffleMatchCard key={match.id} matchId={match.id} gameNumber={idx + 1} />
                        ))}
                      </div>
                    </details>
                  )
                })}
            </>
          )}
        </div>

        {/* ---- Divisions tab ---- */}
        <div className={tabContentClass('divisions')} id="shuffle_divisions_tab">
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
                    <div style={{ marginBottom: '12px', fontSize: '0.85rem', opacity: 0.8 }}>
                      Vitória: <strong>{3 * mult} pts</strong> · Empate: <strong>{1 * mult} pts</strong> · Multiplicador: ×{mult}
                    </div>
                    <table className="classification_table">
                      <thead>
                        <tr>
                          <th />
                          <th />
                          <th className="optional_table_columns">V</th>
                          <th className="optional_table_columns">E</th>
                          <th className="optional_table_columns">D</th>
                          <th className="optional_table_columns">JG</th>
                          <th className="optional_table_columns">JP</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {divPlayers.map((player, idx) => (
                          <tr key={player!.id} className="player_classification_row">
                            <td>{idx + 1}</td>
                            <td>{player!.name}</td>
                            <td className="optional_table_columns">{player!.wins}</td>
                            <td className="optional_table_columns">{player!.draws}</td>
                            <td className="optional_table_columns">{player!.losses}</td>
                            <td className="optional_table_columns">{player!.gamesWon}</td>
                            <td className="optional_table_columns">{player!.gamesLost}</td>
                            <td>{player!.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
