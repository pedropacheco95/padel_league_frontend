import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shuffleTournamentApi } from '@/api/shuffleTournament'
import { Match, Player, ShuffleTournamentDetail } from '@/types/tournament'
import { matchesApi } from '@/api/matches'
import LeagueMatchCard from '@/components/LeagueMatchCard'
import EditableMatchCard, { EditableCardPlayer } from '@/components/EditableMatchCard'

type Tab = 'standings' | 'matches' | 'edit_matches' | 'divisions'

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
    const schedule = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
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
    divMatches.forEach(m => {
      if (!ordered.includes(m)) ordered.push(m)
    })
    result.push(...ordered)
  })
  return result
}

export default function ShufflePage() {
  const { user } = useAuth()
  const [data, setData] = useState<ShuffleTournamentDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('standings')
  const [selectedDivision, setSelectedDivision] = useState(1)
  const [matchesDivFilter, setMatchesDivFilter] = useState(0)
  const [editMatchesDivFilter, setEditMatchesDivFilter] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [isCalculatingDivisions, setIsCalculatingDivisions] = useState(false)
  const [isGeneratingMatchweek, setIsGeneratingMatchweek] = useState(false)
  const [actionsError, setActionsError] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState<string>('')
  const [copiedShare, setCopiedShare] = useState(false)

  function fetchData() {
    return shuffleTournamentApi.detail().then(({ data }) => {
      setData(data)
      if (data.divisions.length > 0) setSelectedDivision(prev => prev || data.divisions[0].number)
      return data
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (!data) return null

  const currentMatches = data.matches.filter(m => m.matchweek === data.currentMatchweek)
  const uneditedMatches = data.matches.filter(m => !m.played || m.score1 == null || m.score2 == null)
  const orderedPlayers = data.players

  function getPlayerById(id: string): Player | undefined {
    return data.players.find(p => p.id === id)
  }

  function getDivisionForPlayer(playerId: string): number {
    const div = data.divisions.find(d => d.playerIds.includes(playerId))
    return div ? div.number : 0
  }

  async function handleCalculateDivisions() {
    setActionsError(null)
    setIsCalculatingDivisions(true)
    try {
      await shuffleTournamentApi.calculateDivisions(data.id)
      await fetchData()
    } catch (error) {
      setActionsError('Não foi possível calcular divisões.')
    } finally {
      setIsCalculatingDivisions(false)
    }
  }

  async function handleGenerateMatchweek() {
    setActionsError(null)
    setCopiedShare(false)
    setIsGeneratingMatchweek(true)
    try {
      await shuffleTournamentApi.generateMatchweek(data.id)
      const refreshed = await fetchData()
      if (refreshed) {
        setShareMessage(buildShuffleShareMessage(refreshed))
      }
    } catch (error) {
      setActionsError('Não foi possível gerar nova jornada.')
    } finally {
      setIsGeneratingMatchweek(false)
    }
  }

  function buildShuffleShareMessage(tournament: ShuffleTournamentDetail): string {
    const emojis = ['🟡', '🔴', '🟢', '🔵']
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const dateLabel = `${day}/${month}`

    const lines: string[] = [
      `🚨*${tournament.title} 💥 | ${tournament.currentMatchweek}ª Jornada - ${dateLabel} às 21h30 | PAC*🚨`,
      '',
    ]

    const playersById = new Map(tournament.players.map(p => [p.id, p]))

    tournament.divisions
      .sort((a, b) => a.number - b.number)
      .forEach(division => {
        lines.push(`*${division.number}.ª Divisão*`)
        const ids = division.playerIds.slice(0, 8)
        const pairs: [string | undefined, string | undefined][] = [
          [ids[0], ids[7]],
          [ids[1], ids[6]],
          [ids[2], ids[5]],
          [ids[3], ids[4]],
        ]

        pairs.forEach((pair, pairIdx) => {
          const emoji = emojis[pairIdx % emojis.length]
          pair.forEach(playerId => {
            if (!playerId) return
            const name = playersById.get(playerId)?.name
            if (name) lines.push(`${emoji} ${name}`)
          })
        })

        lines.push('')
      })

    return lines.join('\n').trim()
  }

  async function handleCopyShareMessage() {
    if (!shareMessage) return
    await navigator.clipboard.writeText(shareMessage)
    setCopiedShare(true)
  }

  function getMatchPlayers(match: Match) {
    const toCardPlayer = (id: string): EditableCardPlayer => {
      const player = getPlayerById(id)
      if (id === 'sub' || !player) {
        return {
          id: null,
          name: 'Jogador substituto',
          fullName: 'Jogador substituto',
          pictureUrl: '/static/images/Player/default_player.jpg',
          rankingPoints: 0,
        }
      }
      return {
        id,
        name: player.name,
        fullName: player.fullName || player.name,
        pictureUrl: player.pictureUrl || '/static/images/Player/default_player.jpg',
        rankingPoints: player.points || 0,
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

  function renderShuffleMatchCard(match: Match, gameNumber: number, editing = false) {
    const mult = data.divisionMultipliers[match.division] || 1
    const divLabel = `Div ${match.division} · x${mult}`
    const headerLabel = `Jogo ${gameNumber} · ${divLabel}`
    const players = getMatchPlayers(match)
    const isEditing = !!user && editing

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
        canEliminatePlayers={!match.played}
        externalEliminated={match.removedPlayers || []}
        onPlayerEliminated={async (playerId, matchweek) => {
          await shuffleTournamentApi.removePlayerFromMatchweek({
            tournamentId: data.id,
            playerId: String(playerId),
            matchweek,
          })
          await fetchData()
        }}
        onSave={async ({ homeGames, awayGames }) => {
          await matchesApi.editShuffleMatch(match.id, { homeGames, awayGames })
          await fetchData()
        }}
      />
    )
  }

  function tabClass(tab: Tab) {
    return `c-tor-header__item${activeTab === tab ? ' c-tor-header__item--active' : ''}`
  }

  function tabContentClass(tab: Tab) {
    return `${activeTab === tab ? ' is-visible' : ''}`
  }

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content" style={{ width: '100%' }}>
          <div className="c-tor-header__title">{data.title}</div>
          <div className="c-tor-header__iandt">
            <span>{data.players.length}/{data.maxPlayers} jogadores · Jornada {data.currentMatchweek}</span>
          </div>
          {user && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button
                className="c-btn c-btn--small"
                disabled={isCalculatingDivisions || isGeneratingMatchweek}
                onClick={handleCalculateDivisions}
                style={{ cursor: isCalculatingDivisions || isGeneratingMatchweek ? 'not-allowed' : 'pointer', opacity: isCalculatingDivisions || isGeneratingMatchweek ? 0.6 : 1 }}
              >
                {isCalculatingDivisions ? 'A calcular...' : 'Calcular Divisões'}
              </button>
              <button
                className="c-btn c-btn--small"
                disabled={isGeneratingMatchweek || isCalculatingDivisions}
                onClick={handleGenerateMatchweek}
                style={{ cursor: isGeneratingMatchweek || isCalculatingDivisions ? 'not-allowed' : 'pointer', opacity: isGeneratingMatchweek || isCalculatingDivisions ? 0.6 : 1 }}
              >
                {isGeneratingMatchweek ? 'A gerar...' : 'Gerar Jornada'}
              </button>
            </div>
          )}
          {actionsError && (
            <div style={{ color: '#b91c1c', fontSize: '1.4rem', marginTop: '8px' }}>
              {actionsError}
            </div>
          )}
          <ul className="c-tor-header__nav u-list-clean" role="tablist">
            <li className={tabClass('standings')} role="presentation">
              <a onClick={() => setActiveTab('standings')}>Classificação</a>
            </li>
            <li className={tabClass('matches')} role="presentation">
              <a onClick={() => setActiveTab('matches')}>Jogos</a>
            </li>
            {user && (
              <li className={tabClass('edit_matches')} role="presentation">
                <a onClick={() => setActiveTab('edit_matches')}>Editar jogos</a>
              </li>
            )}
            <li className={tabClass('divisions')} role="presentation">
              <a onClick={() => setActiveTab('divisions')}>Divisões</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="l-grid">
        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('standings')}`} id="shuffle_standings_tab">
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
                <th style={{ width: '10%' }}>Div</th>
              </tr>
            </thead>
            <tbody>
              {orderedPlayers.map(player => {
                const div = getDivisionForPlayer(player.id)
                const badge = DIV_BADGE[div]
                return (
                  <tr key={player.id} className="player_classification_row">
                    <td>{player.position ?? '-'}</td>
                    <td>{player.name}</td>
                    <td>{player.wins}</td>
                    <td>{player.draws}</td>
                    <td>{player.losses}</td>
                    <td>{player.gamesWon}</td>
                    <td>{player.gamesLost}</td>
                    <td>{player.points}</td>
                    <td>
                      {div > 0 ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            color: badge?.color || '#333',
                            backgroundColor: badge?.bg || '#eee',
                          }}
                        >
                          Div {div}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('matches')}`} id="shuffle_matches_tab">
          <div style={{ position: 'relative' }}>
            {user && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  transform: 'translateY(-115%)',
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
                  onClick={() => setEditMode(prev => !prev)}
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
            {data.divisions.length > 0 && (
              <div className="select_container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <select
                  className="form-select matchweek_select"
                  value={matchesDivFilter}
                  onChange={e => setMatchesDivFilter(Number(e.target.value))}
                >
                  <option value={0}>Todas as divisões</option>
                  {data.divisions.map(d => (
                    <option key={d.number} value={d.number}>Divisão {d.number}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {currentMatches.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Sem jogos para a jornada atual
            </div>
          ) : (
            <div className="l-grid l-grid--tor">
              {orderMatches(
                currentMatches.filter(m => matchesDivFilter === 0 || m.division === matchesDivFilter)
              ).map((match, idx) => (
                <span key={match.id}>{renderShuffleMatchCard(match, idx + 1, !!user && editMode)}</span>
              ))}
            </div>
          )}

          {data.currentMatchweek > 1 && (
            <>
              <br />
              {Array.from({ length: data.currentMatchweek - 1 }, (_, i) => i + 1)
                .reverse()
                .map(mw => {
                  const mwMatches = data.matches.filter(
                    m => m.matchweek === mw && (matchesDivFilter === 0 || m.division === matchesDivFilter)
                  )
                  return (
                    <details key={mw} style={{ marginBottom: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '8px 0' }}>
                        Jornada {mw} ({mwMatches.filter(m => m.played).length}/{mwMatches.length} jogados)
                      </summary>
                      <div className="l-grid l-grid--tor">
                        {orderMatches(mwMatches).map((match, idx) => (
                          <span key={match.id}>{renderShuffleMatchCard(match, idx + 1, !!user && editMode)}</span>
                        ))}
                      </div>
                    </details>
                  )
                })}
            </>
          )}
        </div>

        {user && (
          <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('edit_matches')}`} id="shuffle_edit_matches_tab">
            {data.divisions.length > 0 && (
              <div className="select_container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <select
                  className="form-select matchweek_select"
                  value={editMatchesDivFilter}
                  onChange={e => setEditMatchesDivFilter(Number(e.target.value))}
                >
                  <option value={0}>Todas as divisões</option>
                  {data.divisions.map(d => (
                    <option key={d.number} value={d.number}>Divisão {d.number}</option>
                  ))}
                </select>
              </div>
            )}

            {uneditedMatches.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
                Não há jogos por editar
              </div>
            ) : (
              <div className="l-grid l-grid--tor">
                {orderMatches(
                  uneditedMatches.filter(m => editMatchesDivFilter === 0 || m.division === editMatchesDivFilter)
                ).map((match, idx) => (
                  <span key={match.id}>{renderShuffleMatchCard(match, idx + 1, true)}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`c-flex-table--tab ${tabContentClass('divisions')}`} id="shuffle_divisions_tab">
          {data.divisions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Sem divisões disponíveis
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {data.divisions.map(d => (
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
                const div = data.divisions.find(d => d.number === selectedDivision)
                if (!div) return null
                const mult = data.divisionMultipliers[selectedDivision] || 1
                const divPlayers = div.playerIds
                  .map(id => data.players.find(p => p.id === id))
                  .filter(Boolean)

                return (
                  <>
                    <div className="c-flex-table--shuffle-games c-flex-table c-flex-table--ranking">
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

      {shareMessage && (
        <div
          style={{
            marginTop: '16px',
            background: '#ffffff',
            border: '1px solid #d9d9d9',
            borderRadius: '8px',
            padding: '10px',
            maxWidth: '780px',
            position: 'absolute', 
            top: 0, 
            right: '3rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#111', fontSize: '1.3rem' }}>Mensagem da jornada</strong>
            <button className="c-btn c-btn--small" onClick={handleCopyShareMessage}>
              {copiedShare ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <textarea
            readOnly
            value={shareMessage}
            style={{
              width: '100%',
              minHeight: '240px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '1.25rem',
              lineHeight: 1.35,
              background: '#fff',
              color: '#111',
            }}
          />
        </div>
      )}
    </>
  )
}
