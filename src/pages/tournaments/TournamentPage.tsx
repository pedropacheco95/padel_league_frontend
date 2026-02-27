import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { tournamentsApi } from '@/api/tournaments'
import { TournamentDetail, Match, User } from '@/types'
import { useAuth } from '@/context/AuthContext'
import LeagueMatchCard from '@/components/LeagueMatchCard'
import EditableMatchCard from '@/components/EditableMatchCard'
import MonthlyMatchesCalendar from '@/components/MonthlyMatchesCalendar'

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

  const fetchData = useCallback(() => {
    if (!id) return
    tournamentsApi.detail(Number(id)).then(({ data }) => setData(data))
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!data) return null

  const { division, standings, matches, allMatches } = data

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
        {/* General information tab — standings table */}
        <div className={tabContentClass('general')} id="general_information_tab">
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
          <MatchesTab
            tournamentId={division.id}
            matches={matches}
            allMatches={allMatches}
            user={user}
            onRefresh={fetchData}
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
    </>
  )
}
