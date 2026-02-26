import { Link } from 'react-router-dom'
import { type ReactNode } from 'react'
import { Match } from '@/types'

type PlayerId = number | string

export interface LeagueCardPlayer {
  id: PlayerId | null
  name: string
  fullName?: string
  pictureUrl?: string | null
  rankingPoints?: number
}

interface TeamData {
  players: [LeagueCardPlayer, LeagueCardPlayer]
}

interface Props {
  match?: Match
  homeTeam?: TeamData
  awayTeam?: TeamData
  scoreHome?: number | null
  scoreAway?: number | null
  headerPrimary?: string
  headerSecondary?: string
  fieldLabel?: string | null
  showWatchIcon?: boolean
  showFieldInfo?: boolean
  showTeamRankingScore?: boolean
  showPlayerImages?: boolean
  headerAction?: ReactNode
  playerHrefResolver?: (playerId: PlayerId | null) => string | null
}

const DEFAULT_PLAYER_PHOTO = '/static/images/Player/default_player.jpg'

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'N def'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function DefaultLinkResolver(playerId: PlayerId | null) {
  if (typeof playerId !== 'number' || !playerId) return null
  return `/players/${playerId}`
}

export default function LeagueMatchCard({
  match,
  homeTeam,
  awayTeam,
  scoreHome,
  scoreAway,
  headerPrimary,
  headerSecondary,
  fieldLabel,
  showWatchIcon = true,
  showFieldInfo = true,
  showTeamRankingScore = true,
  showPlayerImages = true,
  headerAction,
  playerHrefResolver = DefaultLinkResolver,
}: Props) {
  if (!match && (!homeTeam || !awayTeam)) return null

  const resolvedHomeTeam = homeTeam ?? { players: match!.homePlayers }
  const resolvedAwayTeam = awayTeam ?? { players: match!.awayPlayers }

  const [hp0, hp1] = resolvedHomeTeam.players
  const [ap0, ap1] = resolvedAwayTeam.players

  const displayScoreHome = scoreHome ?? match?.gamesHomeTeam ?? ''
  const displayScoreAway = scoreAway ?? match?.gamesAwayTeam ?? ''
  const displayPrimary = headerPrimary ?? formatDateFull(match?.dateHour ?? null)
  const displaySecondary = headerSecondary ?? formatDateShort(match?.dateHour ?? null)
  const displayField = fieldLabel ?? match?.field ?? null

  const homeTeamScore = (hp0.rankingPoints ?? 0) + (hp1.rankingPoints ?? 0)
  const awayTeamScore = (ap0.rankingPoints ?? 0) + (ap1.rankingPoints ?? 0)

  function renderTeam(players: [LeagueCardPlayer, LeagueCardPlayer], teamScore: number) {
    const [p0, p1] = players
    const p0Href = playerHrefResolver(p0.id)
    const p1Href = playerHrefResolver(p1.id)

    return (
      <div className="c-teams__container">
        {showPlayerImages && (
          <div className="l-wrapper">
            {p0Href ? (
              <Link className="c-trigger" to={p0Href}>
                <div
                  className="c-teams__img u-img-cropped u-img-cropped--team"
                  style={{ backgroundImage: `url(${p0.pictureUrl || DEFAULT_PLAYER_PHOTO})` }}
                />
              </Link>
            ) : (
              <div
                className="c-teams__img u-img-cropped u-img-cropped--team"
                style={{ backgroundImage: `url(${p0.pictureUrl || DEFAULT_PLAYER_PHOTO})` }}
              />
            )}
          </div>
        )}
        <div className="c-teams__details">
          <div className="l-wrapper">
            {showTeamRankingScore && <div className="c-teams__score">{teamScore}</div>}
            <div className="c-teams__players">
              <div className="c-teams__name">{p0.fullName || p0.name}</div>
              <div className="c-teams__name">{p1.fullName || p1.name}</div>
              <div className="c-teams__name_small">{p0.name}</div>
              <div className="c-teams__name_small">{p1.name}</div>
            </div>
          </div>
        </div>
        {showPlayerImages && (
          <div className="l-wrapper">
            {p1Href ? (
              <Link className="c-trigger" to={p1Href}>
                <div
                  className="c-teams__img u-img-cropped u-img-cropped--team"
                  style={{ backgroundImage: `url(${p1.pictureUrl || DEFAULT_PLAYER_PHOTO})` }}
                />
              </Link>
            ) : (
              <div
                className="c-teams__img u-img-cropped u-img-cropped--team"
                style={{ backgroundImage: `url(${p1.pictureUrl || DEFAULT_PLAYER_PHOTO})` }}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="c-tor-box c-tor-box--m">
      <br />
      <div className="c-teams c-teams--double c-teams--vs">
        <div className="c-teams__header c-teams__header--played">
          <div className="c-teams__iandt">
            {showWatchIcon && <img className="small_watch" src="/static/images/watch.png" alt="" />}
            <span className="big-date">{displayPrimary}</span>
            <span className="small-date">{displaySecondary}</span>
          </div>
          <div className="c-teams__iandt">
            <span>
              {displayScoreHome}-{displayScoreAway}
            </span>
          </div>
          <div className="c-teams__iandt">
            {headerAction ?? (
              showFieldInfo && (
                <>
                  <img className="small_field" src="/static/images/field.png" alt="" />
                  <span>{displayField}</span>
                </>
              )
            )}
          </div>
        </div>
      </div>

      <div className="c-teams__box">
        <div className="c-teams__column">
          <ul className="c-teams__list u-list-clean">
            <li className="c-teams__item on_match">{renderTeam(resolvedHomeTeam.players, homeTeamScore)}</li>
          </ul>
        </div>

        <span className="c-teams__vs">VS</span>

        <div className="c-teams__column">
          <ul className="c-teams__list u-list-clean">
            <li className="c-teams__item on_match">{renderTeam(resolvedAwayTeam.players, awayTeamScore)}</li>
          </ul>
        </div>
      </div>
      <br />
    </section>
  )
}
