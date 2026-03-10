import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shuffleTournamentApi } from '@/api/shuffleTournament'
import { Match, Player, ShuffleTournamentDetail } from '@/types/tournament'
import { matchesApi } from '@/api/matches'
import LeagueMatchCard from '@/components/LeagueMatchCard'
import EditableMatchCard, { EditableCardPlayer } from '@/components/EditableMatchCard'
import { PlayerStatsView } from '@/components/PlayerStatsView'
import PlayerComparisonModal from '@/components/PlayerComparisonModal'
import { Loader2 } from 'lucide-react'

type Tab = 'standings' | 'matches' | 'edit_matches' | 'divisions' | 'stats'
type ConfirmAction = 'calculate' | 'undo_divisions' | 'delete_last_matchweek' | null
const DEFAULT_PLAYER_PICTURE = '/static/images/Player/default_player.jpg'

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

function removePlayerFromLocalMatchweek(
  tournament: ShuffleTournamentDetail,
  playerId: string,
  matchweek: number
): ShuffleTournamentDetail {
  return {
    ...tournament,
    matches: tournament.matches.map(match => {
      if (match.matchweek !== matchweek) return match

      return {
        ...match,
        team1: match.team1.map(id => (id === playerId ? 'sub' : id)) as [string, string],
        team2: match.team2.map(id => (id === playerId ? 'sub' : id)) as [string, string],
      }
    }),
  }
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
  const [isUndoingDivisions, setIsUndoingDivisions] = useState(false)
  const [isGeneratingMatchweek, setIsGeneratingMatchweek] = useState(false)
  const [isDeletingLastMatchweek, setIsDeletingLastMatchweek] = useState(false)
  const [actionsError, setActionsError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [shareMessage, setShareMessage] = useState<string>('')
  const [copiedShare, setCopiedShare] = useState(false)
  const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null)
  const [selectedPlayer2, setSelectedPlayer2] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  function fetchData(silent = false) {
    return shuffleTournamentApi
      .detail(silent ? { skipGlobalLoader: true } : undefined)
      .then(({ data }) => {
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

  function getGamesDiff(player: Player): number {
    return (player.gamesWon || 0) - (player.gamesLost || 0)
  }

  function getPresencas(player: Player): number {
    return Math.floor(((player.wins || 0) + (player.draws || 0) + (player.losses || 0)) / 3)
  }

  function getPlayerById(id: string): Player | undefined {
    return data.players.find(p => p.id === id)
  }

  function getDivisionForPlayer(playerId: string): number {
    const div = data.divisions.find(d => d.playerIds.includes(playerId))
    return div ? div.number : 0
  }

  function renderPlayerPicture(player: Player) {
    return (
      <div
        className="c-teams__img u-img-cropped u-img-cropped--classification"
        style={{ backgroundImage: `url(${player.pictureUrl || DEFAULT_PLAYER_PICTURE})` }}
      />
    )
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

  async function handleUndoCalculateDivisions() {
    setActionsError(null)
    setIsUndoingDivisions(true)
    try {
      await shuffleTournamentApi.undoCalculateDivisions(data.id)
      await fetchData()
    } catch (error) {
      setActionsError('Não foi possível desfazer o cálculo das divisões.')
    } finally {
      setIsUndoingDivisions(false)
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

  async function handleDeleteLastMatchweek() {
    setActionsError(null)
    setCopiedShare(false)
    setIsDeletingLastMatchweek(true)
    try {
      await shuffleTournamentApi.deleteLastMatchweek(data.id)
      await fetchData()
      setShareMessage('')
    } catch (error) {
      setActionsError('Não foi possível apagar a última jornada.')
    } finally {
      setIsDeletingLastMatchweek(false)
    }
  }

  async function handleConfirmAction() {
    if (confirmAction === 'calculate') {
      await handleCalculateDivisions()
    } else if (confirmAction === 'undo_divisions') {
      await handleUndoCalculateDivisions()
    } else if (confirmAction === 'delete_last_matchweek') {
      await handleDeleteLastMatchweek()
    }
    setConfirmAction(null)
  }

  const confirmDialogText =
    confirmAction === 'calculate'
      ? 'Tens a certeza que queres calcular novas divisões oh burro?'
      : confirmAction === 'undo_divisions'
        ? 'Foste precipitadinho a criar as divisões e agora queres que alguém te salve é? Desta vez tens a certeza do que estás a fazer?'
        : confirmAction === 'delete_last_matchweek'
          ? 'Foste precipitadinho a criar nova jornada  e agora queres que alguém te salve é? Vais apagar os jogos todos dessa jornada. Tens a certeza?'
          : ''

  const confirmDialogButtonText =
    confirmAction === 'calculate'
      ? 'Sim, calcular'
      : confirmAction === 'undo_divisions'
        ? 'Sim, desfazer'
        : 'Sim, apagar'

  const confirmDialogLoading =
    (confirmAction === 'calculate' && isCalculatingDivisions) ||
    (confirmAction === 'undo_divisions' && isUndoingDivisions) ||
    (confirmAction === 'delete_last_matchweek' && isDeletingLastMatchweek)

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
        rankingPoints: player.rankingPoints || 0,
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
          setData(current =>
            current
              ? removePlayerFromLocalMatchweek(current, String(playerId), matchweek)
              : current
          )
        }}
        onSave={async ({ homeGames, awayGames }) => {
          await matchesApi.editShuffleMatch(match.id, { homeGames, awayGames })
          await fetchData(true)
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
            <span>Jornada {data.currentMatchweek}</span>
          </div>
          {user?.superAdmin && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button
                className="c-btn c-btn--small"
                disabled={isCalculatingDivisions || isUndoingDivisions || isGeneratingMatchweek || isDeletingLastMatchweek}
                onClick={() => setConfirmAction('calculate')}
                style={{
                  cursor:
                    isCalculatingDivisions || isUndoingDivisions || isGeneratingMatchweek || isDeletingLastMatchweek
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isCalculatingDivisions || isUndoingDivisions || isGeneratingMatchweek || isDeletingLastMatchweek
                      ? 0.6
                      : 1,
                  background: '#facc15',
                  borderColor: '#facc15',
                  color: '#1f2937',
                  boxShadow: '0 10px 24px rgba(250, 204, 21, 0.3)',
                  fontWeight: 800,
                  borderRadius: '12px',
                }}
              >
                {isCalculatingDivisions ? 'A calcular...' : 'Calcular Divisões'}
              </button>
              <button
                className="c-btn c-btn--small"
                disabled={isUndoingDivisions || isGeneratingMatchweek || isCalculatingDivisions || isDeletingLastMatchweek}
                onClick={() => setConfirmAction('undo_divisions')}
                style={{
                  cursor:
                    isUndoingDivisions || isGeneratingMatchweek || isCalculatingDivisions || isDeletingLastMatchweek
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isUndoingDivisions || isGeneratingMatchweek || isCalculatingDivisions || isDeletingLastMatchweek
                      ? 0.6
                      : 1,
                  background: '#b42318',
                  borderColor: '#b42318',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '12px',
                }}
              >
                {isUndoingDivisions ? 'A desfazer...' : 'Desfazer calculo de divisoes'}
              </button>
              <button
                className="c-btn c-btn--small"
                disabled={isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions || isDeletingLastMatchweek}
                onClick={handleGenerateMatchweek}
                style={{
                  cursor:
                    isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions || isDeletingLastMatchweek
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions || isDeletingLastMatchweek
                      ? 0.6
                      : 1,
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  color: '#fff',
                  borderRadius: '12px',
                }}
              >
                {isGeneratingMatchweek ? 'A gerar...' : 'Gerar Jornada'}
              </button>
              <button
                className="c-btn c-btn--small"
                disabled={isDeletingLastMatchweek || isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions}
                onClick={() => setConfirmAction('delete_last_matchweek')}
                style={{
                  cursor:
                    isDeletingLastMatchweek || isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isDeletingLastMatchweek || isGeneratingMatchweek || isCalculatingDivisions || isUndoingDivisions
                      ? 0.6
                      : 1,
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '12px',
                }}
              >
                {isDeletingLastMatchweek ? 'A apagar...' : 'Apagar a ultima jornada'}
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
            <li className={tabClass('divisions')} role="presentation">
              <a onClick={() => setActiveTab('divisions')}>Divisões</a>
            </li>
            <li className={tabClass('matches')} role="presentation">
              <a onClick={() => setActiveTab('matches')}>Jogos</a>
            </li>
            {user && (
              <li className={tabClass('edit_matches')} role="presentation">
                <a onClick={() => setActiveTab('edit_matches')}>Editar jogos</a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="l-grid">
        {confirmAction && (
          <div className="gpt_modal" style={{ display: 'flex' }}>
            <div className="modal-content">
              <p>{confirmDialogText}</p>
              <div className="modal-buttons">
                <button onClick={() => setConfirmAction(null)} disabled={confirmDialogLoading} style={{ backgroundColor: '#ccc' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={confirmDialogLoading}
                  style={{ backgroundColor: '#e74c3c', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {confirmDialogLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    confirmDialogButtonText
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selection banner */}
        {selectedPlayer1 && !showComparison && (
          <div className="c-shuffle-selection-banner">
            <span className="c-shuffle-selection-banner__text">
              <strong>{getPlayerById(selectedPlayer1)?.name}</strong> selecionado — clica noutro jogador para comparar
            </span>
            <button onClick={() => setSelectedPlayer1(null)} className="c-shuffle-selection-banner__close">
              ✕
            </button>
          </div>
        )}

        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('standings')}`} id="shuffle_standings_tab">
          <table id="classification_table" className="classification_table">
            <thead>
              <tr>
                <th />
                <th />
                <th />
                <th className="desktop_table_columns">V</th>
                <th className="desktop_table_columns">E</th>
                <th className="desktop_table_columns">D</th>
                <th className="desktop_table_columns">JG</th>
                <th className="desktop_table_columns">JP</th>
                <th className="optional_table_columns">P</th>
                <th className="optional_table_columns">DJ</th>
                <th>Pts</th>
                <th className="shuffle-div-column">Div</th>
              </tr>
            </thead>
            <tbody>
              {orderedPlayers.map(player => {
                const div = getDivisionForPlayer(player.id)
                const badge = DIV_BADGE[div]
                const isSelected = player.id === selectedPlayer1
                return (
                  <tr
                    key={player.id}
                    className="player_classification_row"
                    onClick={() => {
                      if (selectedPlayer1 && selectedPlayer1 !== player.id) {
                        setSelectedPlayer2(player.id)
                        setShowComparison(true)
                      } else if (selectedPlayer1 === player.id) {
                        setSelectedPlayer1(null)
                      } else {
                        setSelectedPlayer1(player.id)
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(6,182,212,0.12)' : undefined,
                      boxShadow: isSelected ? 'inset 3px 0 0 #06b6d4' : undefined,
                      transition: 'background 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <td>{player.position ?? '-'}</td>
                    <td>{renderPlayerPicture(player)}</td>
                    <td className="shuffle-player-name-cell">
                      <span className="shuffle-player-name">
                        <span>{player.name}</span>
                        <span className="shuffle-ranking-points-badge">{player.rankingPoints ?? 0}</span>
                      </span>
                    </td>
                    <td className="desktop_table_columns">{player.wins}</td>
                    <td className="desktop_table_columns">{player.draws}</td>
                    <td className="desktop_table_columns">{player.losses}</td>
                    <td className="desktop_table_columns">{player.gamesWon}</td>
                    <td className="desktop_table_columns">{player.gamesLost}</td>
                    <td className="optional_table_columns">{getGamesDiff(player)}</td>
                    <td className="optional_table_columns">{getPresencas(player)}</td>
                    <td>{player.points}</td>
                    <td className="shuffle-div-column">
                      {div > 0 ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: badge?.color || '#333',
                            backgroundColor: badge?.bg || '#eee',
                            whiteSpace: 'nowrap',
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
          <div className="shuffle-columns-legend">
            <span className="optional_table_columns">
              DJ: Diferença de jogos (JG - JP) · P: Presenças ((V+E+D)/3) · Badge ao lado do nome: Ranking points
            </span>
            <span className="desktop_table_columns">
              V: Vitórias · E: Empates · D: Derrotas · JG: Jogos ganhos · JP: Jogos perdidos · Badge ao lado do nome: Ranking points
            </span>
          </div>
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
                            <th />
                            <th className="desktop_table_columns">V</th>
                            <th className="desktop_table_columns">E</th>
                            <th className="desktop_table_columns">D</th>
                            <th className="desktop_table_columns">JG</th>
                            <th className="desktop_table_columns">JP</th>
                            <th className="optional_table_columns">P</th>
                            <th className="optional_table_columns">DJ</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divPlayers.map((player, idx) => (
                            <tr key={player!.id} className="player_classification_row">
                              <td>{idx + 1}</td>
                              <td>{renderPlayerPicture(player!)}</td>
                              <td className="shuffle-player-name-cell">
                                <span className="shuffle-player-name">
                                  <span>{player!.name}</span>
                                  <span className="shuffle-ranking-points-badge">{player!.rankingPoints ?? 0}</span>
                                </span>
                              </td>
                              <td className="desktop_table_columns">{player!.wins}</td>
                              <td className="desktop_table_columns">{player!.draws}</td>
                              <td className="desktop_table_columns">{player!.losses}</td>
                              <td className="desktop_table_columns">{player!.gamesWon}</td>
                              <td className="desktop_table_columns">{player!.gamesLost}</td>
                              <td className="optional_table_columns">{getGamesDiff(player!)}</td>
                              <td className="optional_table_columns">{getPresencas(player!)}</td>
                              <td>{player!.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="shuffle-columns-legend">
                        <span className="optional_table_columns">
                          DJ: Diferença de jogos (JG - JP) · P: Presenças ((V+E+D)/3) · Badge ao lado do nome: Ranking points
                        </span>
                        <span className="desktop_table_columns">
                          V: Vitórias · E: Empates · D: Derrotas · JG: Jogos ganhos · JP: Jogos perdidos · Badge ao lado do nome: Ranking points
                        </span>
                      </div>
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

      {activeTab === 'stats' && (
        <div className="l-grid">
          <PlayerStatsView />
        </div>
      )}

      {showComparison && selectedPlayer1 && selectedPlayer2 && (
        <PlayerComparisonModal
          tournamentId={data.id}
          player1Id={selectedPlayer1}
          player2Id={selectedPlayer2}
          playersCount={data.players.length}
          matches={data.matches}
          getPlayerById={getPlayerById}
          onClose={() => {
            setShowComparison(false)
            setSelectedPlayer1(null)
            setSelectedPlayer2(null)
          }}
        />
      )}
    </>
  )
}
