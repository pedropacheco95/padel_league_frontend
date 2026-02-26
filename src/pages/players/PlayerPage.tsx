import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { playersApi } from '../../api/players'
import { PlayerDetail } from '../../types'

type Tab = 'personal' | 'sports'

const PlayerPage = () => {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('personal')

  useEffect(() => {
    if (!id) return
    playersApi.detail(Number(id))
      .then(res => setPlayer(res.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !player) return null

  const {
    matchesPlayed, matchesWon, matchesLost, matchesDrawn, efficiency,
    tournamentsPlayed, matchweeksPlayed, matchweeksMissed, matchweeksPerTournament, attendance,
    previousPlayer, nextPlayer, tournamentHistory,
  } = player

  return (
    <>
      <div className="l-grid">
        <div className="c-player">
          <div className="c-player__content">
            {previousPlayer && (
              <div className="c-player__prev">
                <Link to={`/players/${previousPlayer.id}`}>
                  <img src="/static/images/chevron-left.svg" alt="anterior" />
                  <div
                    className="u-img-cropped u-img-cropped--team"
                    style={{ backgroundImage: `url(${previousPlayer.pictureUrl})` }}
                  />
                </Link>
              </div>
            )}

            <div className="l-container_player">
              <div className="c-ranking-header c-ranking-header--no-image">
                <h1 className="c-ranking-header__title">{player.fullName}</h1>
                <div className="l-container_player l-container--data">
                  <div className="c-ranking-header__data-box">
                    <p className="c-ranking-header__data-title">Ranking</p>
                    <p className="c-ranking-header__data">{player.rankingPosition}</p>
                  </div>
                  <div className="c-ranking-header__data-box">
                    <p className="c-ranking-header__data-title">Pontos</p>
                    <p className="c-ranking-header__data">{player.rankingPoints}</p>
                  </div>
                </div>
                <img src="/static/images/pt.png" alt="Portugal" />
              </div>
            </div>

            <ul className="c-player__nav u-list-clean" role="tablist">
              <li
                className={`c-player__item${activeTab === 'personal' ? ' c-player__item--active' : ''}`}
                role="presentation"
              >
                <a onClick={() => setActiveTab('personal')} style={{ cursor: 'pointer' }}>
                  Dados pessoais
                </a>
              </li>
              <li
                className={`c-player__item${activeTab === 'sports' ? ' c-player__item--active' : ''}`}
                role="presentation"
              >
                <a onClick={() => setActiveTab('sports')} style={{ cursor: 'pointer' }}>
                  Dados desportivos
                </a>
              </li>
            </ul>

            {nextPlayer && (
              <div className="c-player__next">
                <Link to={`/players/${nextPlayer.id}`}>
                  <img src="/static/images/chevron-right.svg" alt="próximo" />
                  <div
                    className="u-img-cropped u-img-cropped--team"
                    style={{ backgroundImage: `url(${nextPlayer.pictureUrl})` }}
                  />
                </Link>
              </div>
            )}

            <div className="u-gradient u-gradient--horizontal" />
          </div>

          <div className="c-player__footer">
            <div className="c-player__img-container">
              <div
                className="u-img-cropped"
                id="player_image_top"
                style={{ backgroundImage: `url(${player.pictureUrl})` }}
              />
            </div>
            <div className="l-container">
              <ul
                className={`c-player__data-list u-list-clean${activeTab === 'personal' ? ' c-player__data-list--is-visible' : ''}`}
                id="personal_data_tab"
              >
                <li className="c-player__data-item">
                  <h3>Data de nascimento</h3>
                  <p>
                    {player.birthday
                      ? new Date(player.birthday).toLocaleDateString('pt-PT')
                      : 'Não definido'}
                  </p>
                </li>
                <li className="c-player__data-item">
                  <h3>Altura</h3>
                  <p>{player.height ?? '—'}</p>
                </li>
                <li className="c-player__data-item">
                  <h3>Username</h3>
                  <p>{player.username}</p>
                </li>
              </ul>

              <ul
                className={`c-player__data-list u-list-clean${activeTab === 'sports' ? ' c-player__data-list--is-visible' : ''}`}
                id="sports_data_tab"
              >
                <li className="c-player__data-item">
                  <h3>Mão preferida</h3>
                  <p>{player.preferedHand ?? '—'}</p>
                </li>
                <li className="c-player__data-item">
                  <h3>Posição de jogo</h3>
                  <p>{player.preferedPosition ?? '—'}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Match stats table */}
      <div className="l-grid player_tables_container">
        <div className="c-ranking-header c-ranking-header--no-image c-ranking-header--table">
          <div className="l-container_player l-container--data player_games_table">
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Encontros jogados</p>
              <p className="c-ranking-header__data">
                <Link to={`/matches/player/${player.id}/played`}>{matchesPlayed}</Link>
              </p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Encontros ganhos</p>
              <p className="c-ranking-header__data">
                <Link to={`/matches/player/${player.id}/won`}>{matchesWon}</Link>
              </p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Encontros perdidos</p>
              <p className="c-ranking-header__data">
                <Link to={`/matches/player/${player.id}/lost`}>{matchesLost}</Link>
              </p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Encontros empatados</p>
              <p className="c-ranking-header__data">
                <Link to={`/matches/player/${player.id}/drawn`}>{matchesDrawn}</Link>
              </p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Eficácia</p>
              <p className="c-ranking-header__data">{efficiency}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament stats table */}
      <div className="l-grid player_tables_container">
        <div className="c-ranking-header c-ranking-header--no-image c-ranking-header--table">
          <div className="l-container_player l-container--data player_games_table">
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Torneios jogados</p>
              <p className="c-ranking-header__data">{tournamentsPlayed}</p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Jornadas jogadas</p>
              <p className="c-ranking-header__data">{matchweeksPlayed}</p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Jornadas Faltadas</p>
              <p className="c-ranking-header__data">{matchweeksMissed}</p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Jornadas por torneio</p>
              <p className="c-ranking-header__data">{matchweeksPerTournament}</p>
            </div>
            <div className="c-ranking-header__data-box">
              <p className="c-ranking-header__data-title">Assiduidade</p>
              <p className="c-ranking-header__data">{attendance}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament history flex table */}
      <div className="l-grid player_tables_container">
        <div className="c-flex-table c-flex-table--ranking c-flex-table--tab c-flex-table--blue is-visible">
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Torneio</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <Link to={`/tournaments/${row.divisionId}`}>
                    <span className="c-flex-table__item-title">{row.divisionName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Último jogo</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <span className="c-flex-table__item-title">
                    {row.endDate
                      ? new Date(row.endDate).toLocaleDateString('pt-PT')
                      : 'Não definido'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Encontros ganhos</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <span className="c-flex-table__item-title">{row.won}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Encontros jogados</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <span className="c-flex-table__item-title">{row.played}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Posição</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <span className="c-flex-table__item-title">{row.place}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Pontos de Ranking</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {tournamentHistory.map(row => (
                <li key={row.divisionId} className="c-flex-table__item">
                  <span className="c-flex-table__item-title">{row.rankingPoints}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export default PlayerPage
