import { Link } from 'react-router-dom'
import { Match } from '@/types'

interface Props {
  match: Match
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'N def'
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function LeagueMatchCard({ match }: Props) {
  const [hp0, hp1] = match.homePlayers
  const [ap0, ap1] = match.awayPlayers

  return (
    <section className="c-tor-box c-tor-box--m">
      <br />
      <div className="c-teams c-teams--double c-teams--vs">
        <div className="c-teams__header c-teams__header--played">
          <div className="c-teams__iandt">
            <img className="small_watch" src="/static/images/watch.png" alt="" />
            <span className="big-date">{formatDateFull(match.dateHour)}</span>
            <span className="small-date">{formatDateShort(match.dateHour)}</span>
          </div>
          <div className="c-teams__iandt">
            <span>
              {match.gamesHomeTeam ?? ''}-{match.gamesAwayTeam ?? ''}
            </span>
          </div>
          <div className="c-teams__iandt">
            <img className="small_field" src="/static/images/field.png" alt="" />
            <span>{match.field}</span>
          </div>
        </div>
      </div>

      <div className="c-teams__box">
        <div className="c-teams__column">
          <ul className="c-teams__list u-list-clean">
            <li className="c-teams__item on_match">
              <div className="c-teams__container">
                <div className="l-wrapper">
                  <Link className="c-trigger" to={hp0.id ? `/players/${hp0.id}` : '#'}>
                    <div
                      className="c-teams__img u-img-cropped u-img-cropped--team"
                      style={{ backgroundImage: `url(${hp0.pictureUrl})` }}
                    />
                  </Link>
                </div>
                <div className="c-teams__details">
                  <div className="l-wrapper">
                    <div className="c-teams__score">{hp0.rankingPoints + hp1.rankingPoints}</div>
                    <div className="c-teams__players">
                      <div className="c-teams__name">{hp0.fullName}</div>
                      <div className="c-teams__name">{hp1.fullName}</div>
                      <div className="c-teams__name_small">{hp0.name}</div>
                      <div className="c-teams__name_small">{hp1.name}</div>
                    </div>
                  </div>
                </div>
                <div className="l-wrapper">
                  <Link className="c-trigger" to={hp1.id ? `/players/${hp1.id}` : '#'}>
                    <div
                      className="c-teams__img u-img-cropped u-img-cropped--team"
                      style={{ backgroundImage: `url(${hp1.pictureUrl})` }}
                    />
                  </Link>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <span className="c-teams__vs">VS</span>

        <div className="c-teams__column">
          <ul className="c-teams__list u-list-clean">
            <li className="c-teams__item on_match">
              <div className="c-teams__container">
                <div className="l-wrapper">
                  <Link className="c-trigger" to={ap0.id ? `/players/${ap0.id}` : '#'}>
                    <div
                      className="c-teams__img u-img-cropped u-img-cropped--team"
                      style={{ backgroundImage: `url(${ap0.pictureUrl})` }}
                    />
                  </Link>
                </div>
                <div className="c-teams__details">
                  <div className="l-wrapper">
                    <div className="c-teams__score">{ap0.rankingPoints + ap1.rankingPoints}</div>
                    <div className="c-teams__players">
                      <div className="c-teams__name">{ap0.fullName}</div>
                      <div className="c-teams__name">{ap1.fullName}</div>
                      <div className="c-teams__name_small">{ap0.name}</div>
                      <div className="c-teams__name_small">{ap1.name}</div>
                    </div>
                  </div>
                </div>
                <div className="l-wrapper">
                  <Link className="c-trigger" to={ap1.id ? `/players/${ap1.id}` : '#'}>
                    <div
                      className="c-teams__img u-img-cropped u-img-cropped--team"
                      style={{ backgroundImage: `url(${ap1.pictureUrl})` }}
                    />
                  </Link>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <br />
    </section>
  )
}
