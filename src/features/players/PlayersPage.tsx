import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatPoints } from '@/components/v2/PointsValue'
import { byRanking, useV2Players } from './api'

const FALLBACK = '/static/images/Player/default_player.jpg'

export default function PlayersPage() {
  const { data, isLoading, error } = useV2Players()
  const players = useMemo(() => [...(data ?? [])].sort(byRanking), [data])

  if (isLoading) return <div className="loader" />
  if (error) return <p className="text-center text-[15px] py-[40px]">Não foi possível carregar os jogadores.</p>

  return (
    <div className="l-grid">
      <div className="c-ranking c-ranking--half">
        <div className="c-ranking__block">
          <div className="c-ranking__title">
            <h3>RANKING</h3>
          </div>
          <p className="text-center text-[14px] py-[8px]">
            <Link to="/ranking" className="underline">Ver ranking detalhado</Link>
          </p>
          <ul className="c-player-card u-list-clean">
            {players.map((player) => (
              <li key={player.id} className="c-player-card__item">
                <Link className="c-trigger" to={`/players/${player.id}`}>
                  <div className="c-player-card__header">
                    <div className="c-player-card__details">
                      <div className="c-player-card__position">{player.rankingPosition ?? '—'}</div>
                      <div className="c-player-card__name">{player.fullName || player.name}</div>
                    </div>
                    <div className="l-wrapper">
                      <div
                        className="c-player-card__img u-img-cropped u-img-cropped--blue"
                        style={{ backgroundImage: `url(${player.pictureUrl || FALLBACK})` }}
                      />
                    </div>
                  </div>
                  <div className="c-player-card__footer">
                    <div className="l-wrapper">
                      <img className="c-player-card__flag" src="/static/images/pt.png" alt="" role="presentation" />
                    </div>
                    <div className="c-player-card__score">{formatPoints(player.rankingPoints, 0)}</div>
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
