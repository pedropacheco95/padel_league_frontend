import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { tournamentsApi } from '@/api/tournaments'
import { TournamentDetail, Match, User } from '@/types'
import { Player as ComparisonPlayer } from '@/types/tournament'
import { useAuth } from '@/context/AuthContext'
import LeagueMatchCard from '@/components/LeagueMatchCard'
import EditableMatchCard from '@/components/EditableMatchCard'
import MonthlyMatchesCalendar from '@/components/MonthlyMatchesCalendar'
import PlayerComparisonModal from '@/components/PlayerComparisonModal'

type Tab = 'general' | 'matches' | 'edit_matches' | 'calendar' | 'add_game'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  )
}

// ---------------------------------------------------------------------------
// MatchesTab — played matches in view mode; all matches + inline edit for users
// ---------------------------------------------------------------------------
interface MatchesTabProps {
  tournamentId: number
  matches: Match[]
  allMatches: Match[]
  user: User | null
  onRefresh: () => void
  forceEdit?: boolean
  showOnlyUnedited?: boolean
}

function MatchesTab({
  tournamentId,
  matches,
  allMatches,
  user,
  onRefresh,
  forceEdit = false,
  showOnlyUnedited = false,
}: MatchesTabProps) {
  const [selectedMatchweek, setSelectedMatchweek] = useState<string>('')
  const [eliminatedByMatchweek, setEliminatedByMatchweek] = useState<Map<number, Set<number>>>(new Map())

  async function handlePlayerEliminated(playerId: number, matchweek: number) {
    await tournamentsApi.removePlayerFromMatchweek(tournamentId, { playerId, matchweek })
    setEliminatedByMatchweek(prev => {
      const next = new Map(prev)
      const week = next.get(matchweek) ?? new Set<number>()
      next.set(matchweek, new Set([...week, playerId]))
      return next
    })
    onRefresh()
  }

  const isEditing = forceEdit && !!user
  const baseMatches = isEditing ? allMatches : matches
  const uneditedFilter = (m: Match) => !m.played || m.gamesHomeTeam == null || m.gamesAwayTeam == null
  const displayMatches = showOnlyUnedited ? baseMatches.filter(uneditedFilter) : baseMatches

  const filtered = selectedMatchweek
    ? displayMatches.filter(m => String(m.matchweek) === selectedMatchweek)
    : displayMatches

  return (
    <div className="l-grid l-grid--tor">
      <div style={{ position: 'relative' }}>
        <div
          className="select_container"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          {displayMatches.length > 0 && (
            <select
              className="form-select matchweek_select"
              value={selectedMatchweek}
              onChange={e => setSelectedMatchweek(e.target.value)}
            >
              <option value="">Jornada</option>
              {[1, 2, 3, 4, 5, 6, 7].map(mw => (
                <option key={mw} value={mw}>{mw}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <br />
      {filtered.map(match => (
        <span key={match.id}>
          {isEditing ? (
            <EditableMatchCard
              match={match}
              onSaved={onRefresh}
              onPlayerEliminated={handlePlayerEliminated}
              externalEliminated={[...(eliminatedByMatchweek.get(match.matchweek) ?? [])]}
            />
          ) : (
            <LeagueMatchCard match={match} />
          )}
          <br />
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CalendarTab — plain list of all matches
// ---------------------------------------------------------------------------
function CalendarTab({ divisionId }: { divisionId: number }) {
  return (
    <>
      <br />
      <MonthlyMatchesCalendar divisionId={divisionId} />
      <br />
    </>
  )
}

// ---------------------------------------------------------------------------
// TournamentPage
// ---------------------------------------------------------------------------
export default function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<TournamentDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null)
  const [selectedPlayer2, setSelectedPlayer2] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [refreshingStandings, setRefreshingStandings] = useState(false)
  const [refreshHover, setRefreshHover] = useState(false)

  const fetchData = useCallback(() => {
    if (!id) return
    tournamentsApi.detail(Number(id)).then(({ data }) => setData(data))
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefreshStandings() {
    if (!id || refreshingStandings) return
    setRefreshingStandings(true)
    try {
      const { data: refreshed } = await tournamentsApi.refreshStandings(Number(id))
      setData(prev =>
        prev
          ? {
              ...prev,
              standings: refreshed.standings,
              division: { ...prev.division, standingsUpToDate: refreshed.standingsUpToDate },
            }
          : prev
      )
    } finally {
      setRefreshingStandings(false)
    }
  }

  if (!data) return null

  const { division, standings, matches, allMatches } = data

  function getPlayerById(id: string): ComparisonPlayer | undefined {
    const found = data.players.find(p => String(p.id) === id)
    if (!found || found.id == null) return undefined
    return {
      id: String(found.id),
      name: found.name,
      fullName: found.fullName,
      pictureUrl: found.pictureUrl,
      rankingPoints: found.rankingPoints,
      position: 0,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
    }
  }

  function tabClass(tab: Tab) {
    return `c-tor-header__item${activeTab === tab ? ' c-tor-header__item--active' : ''}`
  }

  function tabContentClass(tab: Tab) {
    return `c-flex-table c-flex-table--ranking c-flex-table--tab${activeTab === tab ? ' is-visible' : ''}`
  }

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__img-container">
          <div className="c-trigger">
            <img
              className="c-tor-header__poster"
              src={division.logoImageUrl ?? ''}
              alt="Tournament"
            />
          </div>
        </div>
        <div className="c-tor-header__content">
          <div className="c-tor-header__title">{division.tournamentName}</div>
          <div className="c-tor-header__iandt">
            <span>
              Porto de {formatDate(division.beginningDatetime)} a {formatDate(division.endDate)}
            </span>
          </div>
          <ul className="c-tor-header__nav u-list-clean" role="tablist">
            <li className={tabClass('general')} role="presentation">
              <a onClick={() => setActiveTab('general')}>Informação geral</a>
            </li>
            <li className={tabClass('matches')} role="presentation">
              <a onClick={() => setActiveTab('matches')}>Resultados</a>
            </li>
            {user && (
              <li className={tabClass('edit_matches')} role="presentation">
                <a onClick={() => setActiveTab('edit_matches')}>Editar jogos</a>
              </li>
            )}
            <li className={tabClass('calendar')} role="presentation">
              <a onClick={() => setActiveTab('calendar')}>Calendário</a>
            </li>
            {division.openDivision && user && (
              <li className={tabClass('add_game')} role="presentation">
                <a onClick={() => setActiveTab('add_game')}>Adicionar jogo</a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="l-grid">
        {selectedPlayer1 && !showComparison && (
          <div className="c-shuffle-selection-banner">
            <span className="c-shuffle-selection-banner__text">
              <strong>{getPlayerById(selectedPlayer1)?.name}</strong> selecionado - clica noutro jogador para comparar
            </span>
            <button
              onClick={() => setSelectedPlayer1(null)}
              className="c-shuffle-selection-banner__close"
            >
              X
            </button>
          </div>
        )}

        {/* General information tab — standings table */}
        <div className={tabContentClass('general')} id="general_information_tab">
          {user && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                type="button"
                title={
                  division.standingsUpToDate === false
                    ? 'Classificação desatualizada — clica para atualizar'
                    : 'Atualizar classificação'
                }
                aria-label="Atualizar classificação"
                onClick={handleRefreshStandings}
                disabled={refreshingStandings}
                onMouseEnter={() => setRefreshHover(true)}
                onMouseLeave={() => setRefreshHover(false)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  borderRadius: '50%',
                  background: refreshHover && !refreshingStandings ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
                  color: '#6c757d',
                  cursor: refreshingStandings ? 'not-allowed' : 'pointer',
                  opacity: refreshingStandings ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                <RefreshCw
                  size={14}
                  className={refreshingStandings ? 'animate-spin' : ''}
                />
                {division.standingsUpToDate === false && !refreshingStandings && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-warning, #e0a800)',
                    }}
                  />
                )}
              </button>
            </div>
          )}
          <table id="classification_table" className="classification_table">
            <thead>
              <tr>
                <th />
                <th />
                <th />
                <th className="optional_table_columns">Presenças</th>
                <th className="optional_table_columns">V</th>
                <th className="optional_table_columns">E</th>
                <th className="optional_table_columns">D</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(row => (
                <tr
                  key={row.player.id}
                  className="player_classification_row"
                  id={String(row.player.id)}
                  onClick={() => {
                    if (!row.player.id) return
                    const currentId = String(row.player.id)
                    if (selectedPlayer1 && selectedPlayer1 !== currentId) {
                      setSelectedPlayer2(currentId)
                      setShowComparison(true)
                    } else if (selectedPlayer1 === currentId) {
                      setSelectedPlayer1(null)
                    } else {
                      setSelectedPlayer1(currentId)
                    }
                  }}
                  style={{
                    cursor: row.player.id ? 'pointer' : 'default',
                    background:
                      selectedPlayer1 === String(row.player.id)
                        ? 'rgba(6,182,212,0.12)'
                        : undefined,
                    boxShadow:
                      selectedPlayer1 === String(row.player.id)
                        ? 'inset 3px 0 0 #06b6d4'
                        : undefined,
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                >
                  <td>{row.position}</td>
                  <td>
                    <Link
                      className="c-trigger"
                      to={row.player.id ? `/players/${row.player.id}` : '#'}
                    >
                      <div
                        className="c-teams__img u-img-cropped u-img-cropped--classification"
                        style={{ backgroundImage: `url(${row.player.pictureUrl})` }}
                      />
                    </Link>
                  </td>
                  <td>{row.player.name}</td>
                  <td className="optional_table_columns">{row.appearances}</td>
                  <td className="optional_table_columns">{row.wins}</td>
                  <td className="optional_table_columns">{row.draws}</td>
                  <td className="optional_table_columns">{row.losts}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matches tab */}
        <div className={tabContentClass('matches')} id="matches_information_tab">
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
          </div>
          <MatchesTab
            tournamentId={division.id}
            matches={matches}
            allMatches={allMatches}
            user={user}
            onRefresh={fetchData}
            forceEdit={editMode}
          />
        </div>

        {user && (
          <div className={tabContentClass('edit_matches')} id="edit_matches_tab">
            <MatchesTab
              tournamentId={division.id}
              matches={matches}
              allMatches={allMatches}
              user={user}
              onRefresh={fetchData}
              forceEdit
              showOnlyUnedited
            />
          </div>
        )}

        {/* Calendar tab */}
        <div className={tabContentClass('calendar')} id="calendar_tab">
          <CalendarTab divisionId={division.id} />
        </div>

        {/* Add game tab */}
        {division.openDivision && user && (
          <div className={tabContentClass('add_game')} id="add_game_tab" />
        )}
      </div>

      {showComparison && selectedPlayer1 && selectedPlayer2 && (
        <PlayerComparisonModal
          tournamentId={division.id}
          player1Id={selectedPlayer1}
          player2Id={selectedPlayer2}
          playersCount={data.players.length}
          matches={[]}
          getPlayerById={getPlayerById}
          loadComparison={({ tournamentId, player1Id, player2Id }) =>
            tournamentsApi.playerComparison(tournamentId, { player1Id, player2Id })
          }
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
