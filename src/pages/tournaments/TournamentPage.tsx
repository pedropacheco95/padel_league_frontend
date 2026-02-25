import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { tournamentsApi } from '@/api/tournaments'
import { TournamentDetail, Match } from '@/types'
import { useAuth } from '@/context/AuthContext'
import LeagueMatchCard from '@/components/LeagueMatchCard'

type Tab = 'general' | 'matches' | 'calendar' | 'add_game'

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

// Matches by matchweek selector — mirrors matches_cards macro
function MatchesTab({ matches }: { matches: Match[] }) {
  const [selectedMatchweek, setSelectedMatchweek] = useState<string>('')

  const filtered = selectedMatchweek
    ? matches.filter((m) => String(m.matchweek) === selectedMatchweek)
    : matches

  return (
    <div className="l-grid l-grid--tor">
      <div className="select_container">
        {matches.length > 0 && (
          <select
            className="form-select matchweek_select"
            value={selectedMatchweek}
            onChange={(e) => setSelectedMatchweek(e.target.value)}
          >
            <option value="">Jornada</option>
            {[1, 2, 3, 4, 5, 6, 7].map((mw) => (
              <option key={mw} value={mw}>
                {mw}
              </option>
            ))}
          </select>
        )}
      </div>
      <br />
      {filtered.map((match) => (
        <span key={match.id}>
          <LeagueMatchCard match={match} />
          <br />
        </span>
      ))}
    </div>
  )
}

// Calendar tab — replaces the Chart.js full-calendar with a plain list of all matches
function CalendarTab({ allMatches }: { allMatches: Match[] }) {
  return (
    <>
      <br />
      <div id="calendar" className="calendar_in_tournament">
        {allMatches.map((match) => (
          <div key={match.id} className="calendar_match_item">
            <span>{formatDateTime(match.dateHour)}</span>
            {' — '}
            <span>{match.homePlayers.map((p) => p.name).join(' / ')}</span>
            {' vs '}
            <span>{match.awayPlayers.map((p) => p.name).join(' / ')}</span>
            {match.played && (
              <span>
                {' '}({match.gamesHomeTeam}-{match.gamesAwayTeam})
              </span>
            )}
          </div>
        ))}
      </div>
      <br />
    </>
  )
}

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<TournamentDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  useEffect(() => {
    if (!id) return
    tournamentsApi.detail(Number(id)).then(({ data }) => setData(data))
  }, [id])

  if (!data) return null

  const { division, standings, matches, allMatches } = data

  function tabClass(tab: Tab) {
    return `c-tor-header__item${activeTab === tab ? ' c-tor-header__item--active' : ''}`
  }

  function tabContentClass(tab: Tab) {
    return `c-flex-table c-flex-table--ranking${activeTab === tab ? ' is-visible' : ''}`
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
          <table
            id="classification_table"
            className="classification_table"
          >
            <thead>
              <tr>
                <th />
                <th />
                <th />
                <th className="optional_table_columns">
                  Presenças
                </th>
                <th className="optional_table_columns">
                  V
                </th>
                <th className="optional_table_columns">
                  E
                </th>
                <th className="optional_table_columns">
                  D
                </th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
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
                  <td className="optional_table_columns">
                    {row.appearances}
                  </td>
                  <td className="optional_table_columns">
                    {row.wins}
                  </td>
                  <td className="optional_table_columns">
                    {row.draws}
                  </td>
                  <td className="optional_table_columns">
                    {row.losts}
                  </td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matches tab */}
        <div className={tabContentClass('matches')} id="matches_information_tab">
          <MatchesTab matches={matches} />
        </div>

        {/* Calendar tab */}
        <div className={tabContentClass('calendar')} id="calendar_tab">
          <CalendarTab allMatches={allMatches} />
        </div>

        {/* Add game tab — wired up when matches module is migrated */}
        {division.openDivision && user && (
          <div className={tabContentClass('add_game')} id="add_game_tab" />
        )}
      </div>
    </>
  )
}
