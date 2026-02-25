import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi } from '../../api/players'
import { PlayerRanking } from '../../types'

const PlayersPage = () => {
  const [players, setPlayers] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    playersApi.ranking()
      .then(res => setPlayers(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <div className="l-grid">
      <div className="c-ranking c-ranking--half">
        <div className="c-ranking__block">
          <div className="c-ranking__title">
            <h3>RANKING</h3>
          </div>
          <ul className="c-player-card u-list-clean">
            {players.map(player => (
              <li key={player.id} className="c-player-card__item">
                <Link className="c-trigger" to={`/players/${player.id}`}>
                  <div className="c-player-card__header">
                    <div className="c-player-card__details">
                      <div className="c-player-card__position">{player.rankingPosition}</div>
                      <div className="c-player-card__name">{player.fullName}</div>
                    </div>
                    <div className="l-wrapper">
                      <div
                        className="c-player-card__img u-img-cropped u-img-cropped--blue"
                        style={{ backgroundImage: `url(${player.pictureUrl})` }}
                      />
                    </div>
                  </div>
                  <div className="c-player-card__footer">
                    <div className="l-wrapper">
                      <img
                        className="c-player-card__flag"
                        src="/static/images/pt.png"
                        alt=""
                        role="presentation"
                      />
                    </div>
                    <div className="c-player-card__score">{player.rankingPoints}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PlayersPage
