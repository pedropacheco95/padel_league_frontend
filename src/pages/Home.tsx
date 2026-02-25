import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mainApi } from '../api/main'
import { IndexData, News, Division, Edition, MatchLine } from '../types'

// ─── NewsContainer ────────────────────────────────────────────────────────────
function MainNewsCard({ news }: { news: News }) {
  const navigate = useNavigate()
  return (
    <article
      className="main_news_article"
      onClick={() => navigate(`/news/${news.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="dark_overlay"></div>
      <img src={news.coverImageUrl ?? ''} alt="" />
      <div className="main_news_article_title">
        <div className="main_news_article_title_container">
          <Link to={`/news/${news.id}`}>{news.title}</Link>
        </div>
      </div>
    </article>
  )
}

function NewsCard({ news }: { news: News }) {
  const navigate = useNavigate()
  return (
    <article
      className="news_article"
      onClick={() => navigate(`/news/${news.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="news_article_container">
        <div className="news_article_image">
          <div className="news_article_image_background">
            <Link to={`/news/${news.id}`}>
              <img src={news.coverImageUrl ?? ''} alt="" />
            </Link>
          </div>
        </div>
        <div className="news_article_main_text">
          <div className="news_article_title_container">
            <Link to={`/news/${news.id}`}>{news.title}</Link>
          </div>
          <div className="news_article_author_container">{news.author}</div>
        </div>
      </div>
    </article>
  )
}

function NewsContainer({ latestNews, allNews }: { latestNews: News | null; allNews: News[] }) {
  if (!allNews.length && !latestNews) return null
  return (
    <div className="news_container index_item">
      <div className="main_news_container">
        {latestNews && <MainNewsCard news={latestNews} />}
      </div>
      <div className="other_news_container">
        <div className="other_news_title">Outras notícias</div>
        {allNews.map(news => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>
    </div>
  )
}

// ─── TeamLine ─────────────────────────────────────────────────────────────────
function TeamLine({ team }: { team: { player1: string; player2: string; result: number | null } }) {
  return (
    <div className="team_line">
      <div className="team_line_players">
        <div className="team_line_player1">
          <div className="line_player_flag">
            <img src="/static/images/pt.png" alt="pt" />
          </div>
          {team.player1}
        </div>
        <div className="team_line_player1">
          <div className="line_player_flag">
            <img src="/static/images/pt.png" alt="pt" />
          </div>
          {team.player2}
        </div>
      </div>
      <div className="team_line_result">{team.result}</div>
    </div>
  )
}

function MatchLineCard({ match }: { match: MatchLine }) {
  return (
    <div className="match_result">
      <TeamLine team={match.home} />
      <TeamLine team={match.away} />
    </div>
  )
}

// ─── EditionResultCard ────────────────────────────────────────────────────────
function EditionResultCard({ edition }: { edition: Edition }) {
  const [activeDivision, setActiveDivision] = useState(0)

  const prev = () =>
    setActiveDivision(i => (i - 1 + edition.divisions.length) % edition.divisions.length)
  const next = () =>
    setActiveDivision(i => (i + 1) % edition.divisions.length)

  return (
    <div className="edition_container index_item">
      <div className="main_edition_container">
        <div className="edition_dates">{edition.shortDateString}</div>
        <div className="edition_name">{edition.fullName}</div>
      </div>
      <div className="edition_results_container">
        <div className="division_results_wrapper">
          {edition.divisions.map((division, index) => (
            <div
              key={division.id}
              className="division_result_block"
              style={{ display: index === activeDivision ? 'block' : 'none' }}
            >
              <div className="division_name">{division.name}</div>
              <div className="match_list">
                {(division.lastPlayedMatches ?? []).map(match => (
                  <MatchLineCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {edition.divisions.length > 1 && (
          <div className="division_nav">
            <button type="button" className="prev_division" onClick={prev}>
              {'<'}
            </button>
            <button type="button" className="next_division" onClick={next}>
              {'>'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TournamentCard ───────────────────────────────────────────────────────────
function TournamentCard({ division }: { division: Division }) {
  const navigate = useNavigate()
  return (
    <div
      className="tournament-card"
      onClick={() => navigate(`/tournaments/${division.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="tournament-card__background"
        style={{ backgroundImage: `url('${division.logoImageUrl ?? ''}')` }}
      >
        <div className="tournament-card__content">
          <div className="tournament-card__tour">{division.editionName}</div>
          <div className="tournament-card__name">{division.name}</div>
          <div className="tournament-card__date">{division.editionShortDateString}</div>
        </div>
      </div>
    </div>
  )
}

function TournamentsIndex({ tournaments }: { tournaments: Division[] }) {
  if (!tournaments.length) return null
  return (
    <div className="tournaments_index_container index_item">
      {tournaments.map(t => (
        <TournamentCard key={t.id} division={t} />
      ))}
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [data, setData] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mainApi.index()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loader"></div>

  return (
    <div className="l-grid">
      <div className="index_container">

        <h1 className="index_title">Notícias</h1>
        <NewsContainer
          latestNews={data?.latestNews ?? null}
          allNews={data?.allNews ?? []}
        />

        {data?.tournaments && data.tournaments.length > 0 && (
          <>
            <h1 className="index_title">Torneios</h1>
            <TournamentsIndex tournaments={data.tournaments} />
          </>
        )}

        {data?.lastEdition && (
          <>
            <h1 className="index_title">Últimos resultados</h1>
            <EditionResultCard edition={data.lastEdition} />
          </>
        )}

      </div>
    </div>
  )
}
