// Home: news, current competitions and the latest Clássica results, all on /api/v2.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import type { CompetitionCard, GroupDetail, Match, Schemas } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'
import { useCompetition, useCompetitions } from '@/features/competitions/api'
import { formatDate, formatLabel } from '@/features/competitions/format'
import { groupsApi } from '@/features/groups/api'

// The news cards below were written for the v1 shape; NewsSummary maps onto it.
type News = { id: number; title: string; author: string | null; coverImageUrl: string | null }
const toNews = (n: Schemas['NewsSummary']): News => ({ id: n.id, title: n.title, author: n.author, coverImageUrl: n.coverImage?.url ?? null })

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
        {(allNews ?? []).map(news => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>
    </div>
  )
}

// ─── Last results ─────────────────────────────────────────────────────────────
function sideNames(m: Match, side: 'home' | 'away') {
  const ps = m.participants.filter((p) => p.side === side).sort((a, b) => a.slot - b.slot)
  return [0, 1].map((i) => ps[i]?.player?.name ?? (ps[i] ? 'Substituto' : '—'))
}

function TeamLine({ players, result }: { players: string[]; result?: number | null }) {
  return (
    <div className="team_line">
      <div className="team_line_players">
        {players.map((name, i) => (
          <div className="team_line_player1" key={i}>
            <div className="line_player_flag">
              <img src="/static/images/pt.png" alt="pt" />
            </div>
            {name}
          </div>
        ))}
      </div>
      <div className="team_line_result">{result}</div>
    </div>
  )
}

function MatchLineCard({ match }: { match: Match }) {
  return (
    <div className="match_result">
      <TeamLine players={sideNames(match, 'home')} result={match.homeScore} />
      <TeamLine players={sideNames(match, 'away')} result={match.awayScore} />
    </div>
  )
}

function LastResults({ competition }: { competition: CompetitionCard }) {
  const { data: detail } = useCompetition(competition.id)
  const groups = useMemo(() => {
    const stage = detail?.stages.find((s) => s.id === detail.currentStageId) ?? detail?.stages[detail.stages.length - 1]
    return [...(stage?.groups ?? [])].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99))
  }, [detail])
  const results = useQueries({
    queries: groups.map((g) => ({ queryKey: ['v2', 'group', g.id], queryFn: () => groupsApi.get(g.id) })),
  })
  const loaded = results.map((r) => r.data).filter((g): g is GroupDetail => !!g)
  const [active, setActive] = useState(0)
  if (!loaded.length) return null
  const n = loaded.length
  return (
    <div className="edition_container index_item">
      <div className="main_edition_container">
        <div className="edition_dates">{formatDate(competition.startsOn)}</div>
        <div className="edition_name">{competition.name}</div>
      </div>
      <div className="edition_results_container">
        <div className="division_results_wrapper">
          {loaded.map((g, i) => (
            <div key={g.id} className="division_result_block" style={{ display: i === active % n ? 'block' : 'none' }}>
              <div className="division_name"><Link to={`/groups/${g.id}`} style={{ color: 'inherit' }}>{g.name}</Link></div>
              <div className="match_list">
                {(g.lastPlayedMatches ?? []).map((m) => <MatchLineCard key={m.id} match={m} />)}
              </div>
            </div>
          ))}
        </div>
        {n > 1 && (
          <div className="division_nav">
            <button type="button" className="prev_division" onClick={() => setActive((i) => (i - 1 + n) % n)}>{'<'}</button>
            <button type="button" className="next_division" onClick={() => setActive((i) => (i + 1) % n)}>{'>'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Competition cards ────────────────────────────────────────────────────────
function CompetitionTile({ c }: { c: CompetitionCard }) {
  const navigate = useNavigate()
  return (
    <div className="tournament-card" onClick={() => navigate(`/competitions/${c.id}`)} style={{ cursor: 'pointer' }}>
      <div
        className="tournament-card__background"
        style={c.coverImage?.url ? { backgroundImage: `url('${c.coverImage.url}')` } : { background: 'linear-gradient(135deg,#006A71,#48A6A7)' }}
      >
        <div className="tournament-card__content">
          <div className="tournament-card__tour">{formatLabel(c)}</div>
          <div className="tournament-card__name">{c.title || c.name}</div>
          <div className="tournament-card__date">{c.startsOn ? formatDate(c.startsOn) : ''}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: competitions } = useCompetitions()
  const { data: newsList } = useQuery({ queryKey: ['v2', 'news'], queryFn: () => v2get<Schemas['NewsSummary'][]>('/news') })
  // Same as v1 /main/index: the latest article, then the three newest others.
  const news = useMemo(() => {
    const all = newsList ?? []
    const latest = all.find((n) => n.latest) ?? null
    return { latestNews: latest ? toNews(latest) : null, allNews: all.filter((n) => n !== latest).slice(0, 3).map(toNews) }
  }, [newsList])

  const current = (competitions ?? []).filter((c) => c.status !== 'ended')
  // Latest Clássica with results: the current season's newest, else the newest overall.
  const lastClassica = (competitions ?? [])
    .filter((c) => c.format === 'classica' && c.status !== 'upcoming')
    .sort((a, b) => Number(b.season.isCurrent) - Number(a.season.isCurrent) || (b.startsOn ?? '').localeCompare(a.startsOn ?? ''))[0]

  return (
    <div className="l-grid">
      <div className="index_container">
        <h1 className="index_title">Notícias</h1>
        <NewsContainer latestNews={news.latestNews} allNews={news.allNews} />

        {current.length > 0 && (
          <>
            <h1 className="index_title">Torneios</h1>
            <div className="tournaments_index_container index_item">
              {current.map((c) => <CompetitionTile key={c.id} c={c} />)}
            </div>
          </>
        )}

        {lastClassica && (
          <>
            <h1 className="index_title">Últimos resultados</h1>
            <LastResults competition={lastClassica} />
          </>
        )}
      </div>
    </div>
  )
}
