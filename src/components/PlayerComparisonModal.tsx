import { useEffect, useMemo, useState } from 'react'
import {
  Match,
  Player,
  PlayerComparisonHeadToHeadResult,
  PlayerComparisonMatchResult,
  PlayerComparisonResponse,
  PlayerComparisonStats,
} from '@/types/tournament'
import { shuffleTournamentApi } from '@/api/shuffleTournament'
import { useIsMobile } from '@/hooks/use-mobile'
import { X } from 'lucide-react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = {
  p1: '#06b6d4',
  p2: '#eab308',
}
const DEFAULT_PLAYER_PICTURE = '/static/images/Player/default_player.jpg'

function StatItem({
  label,
  value,
  color,
  align,
}: {
  label: string
  value: string | number
  color?: string
  align: 'left' | 'right'
}) {
  return (
    <div className={`c-player-compare__stat c-player-compare__stat--${align}`}>
      <span className="c-player-compare__stat-value" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="c-player-compare__stat-label">{label}</span>
    </div>
  )
}

function MatchResultBadge({
  result,
  getPlayerById,
}: {
  result: PlayerComparisonMatchResult
  getPlayerById: (id: string) => Player | undefined
}) {
  const opp1 = getPlayerById(result.opponentIds[0])
  const opp2 = getPlayerById(result.opponentIds[1])

  return (
    <div className="c-player-compare__match-badge">
      <span
        className="c-player-compare__match-score"
        style={{ color: result.won ? '#22c55e' : result.drew ? '#eab308' : '#ef4444' }}
      >
        {result.teamScore}-{result.oppScore}
      </span>
      <span className="c-player-compare__match-opponents">
        vs {opp1?.name || '?'} & {opp2?.name || '?'}
      </span>
      <span className="c-player-compare__match-week">JW{result.matchweek}</span>
    </div>
  )
}

function PlayerCard({
  stats,
  color,
  align,
  getPlayerById,
}: {
  stats: PlayerComparisonStats
  color: string
  align: 'left' | 'right'
  getPlayerById: (id: string) => Player | undefined
}) {
  const streakEmoji = stats.currentStreak.type === 'W' ? '🔥' : stats.currentStreak.type === 'D' ? '➖' : '❄️'
  const streakLbl = stats.currentStreak.type === 'W' ? 'V' : stats.currentStreak.type === 'D' ? 'E' : 'D'

  return (
    <div className="c-player-compare__player-card">
      <div className="c-player-compare__player-heading">
        <div
          className="c-player-compare__player-avatar"
          style={{ backgroundImage: `url(${stats.player.pictureUrl || DEFAULT_PLAYER_PICTURE})` }}
        />
        <h3
          className={`c-player-compare__player-name c-player-compare__player-name--${align}`}
          style={{ color }}
        >
          {stats.player.name}
        </h3>
      </div>

      <div className="c-player-compare__player-stats">
        <StatItem label="Vitórias" value={stats.wins} color="#22c55e" align={align} />
        <StatItem label="Empates" value={stats.draws} color="#eab308" align={align} />
        <StatItem label="Derrotas" value={stats.losses} color="#ef4444" align={align} />
        <StatItem label="Win Rate" value={`${stats.winRate}%`} align={align} />
        <StatItem label="Pontos" value={stats.points} color={color} align={align} />
        <StatItem label="Pts/Jornada" value={stats.avgPointsPerMatchweek} align={align} />
        <StatItem label="Streak" value={`${streakEmoji} ${stats.currentStreak.count}${streakLbl}`} align={align} />
        <StatItem label="Rating" value={stats.player.rankingPoints ?? 0} align={align} />
        <StatItem label="Melhor Div" value={stats.highestDivision || '-'} align={align} />
        <StatItem label="Pior Div" value={stats.lowestDivision || '-'} align={align} />
        <StatItem
          label="Melhor Res."
          value={stats.bestWinDiff > 0 ? `+${stats.bestWinDiff}` : '-'}
          color="#22c55e"
          align={align}
        />
        <StatItem
          label="Pior Res."
          value={stats.worstLossDiff > 0 ? `-${stats.worstLossDiff}` : '-'}
          color="#ef4444"
          align={align}
        />
      </div>

      {stats.biggestWins.length > 0 && (
        <div className="c-player-compare__results-block">
          <div
            className={`c-player-compare__results-title c-player-compare__results-title--win c-player-compare__results-title--${align}`}
          >
            Maiores Vitórias
          </div>
          {stats.biggestWins.map((r, i) => (
            <MatchResultBadge key={i} result={r} getPlayerById={getPlayerById} />
          ))}
        </div>
      )}

      {stats.worstLosses.length > 0 && (
        <div className="c-player-compare__results-block">
          <div
            className={`c-player-compare__results-title c-player-compare__results-title--loss c-player-compare__results-title--${align}`}
          >
            Piores Derrotas
          </div>
          {stats.worstLosses.map((r, i) => (
            <MatchResultBadge key={i} result={r} getPlayerById={getPlayerById} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  tournamentId: number
  player1Id: string
  player2Id: string
  playersCount: number
  matches: Match[]
  loadComparison?: (payload: {
    tournamentId: number
    player1Id: string
    player2Id: string
  }) => Promise<{ data: PlayerComparisonResponse }>
  onClose: () => void
  getPlayerById: (id: string) => Player | undefined
}

export default function PlayerComparisonModal({
  tournamentId,
  player1Id,
  player2Id,
  playersCount,
  matches,
  loadComparison,
  onClose,
  getPlayerById,
}: Props) {
  const isMobile = useIsMobile()
  const [data, setData] = useState<PlayerComparisonResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    setLoadError(null)
    setData(null)

    const load = loadComparison ?? shuffleTournamentApi.playerComparison

    load({ tournamentId, player1Id, player2Id })
      .then(({ data }) => {
        if (isActive) setData(data)
      })
      .catch(() => {
        if (isActive) setLoadError('Não foi possível carregar a comparação dos jogadores.')
      })

    return () => {
      isActive = false
    }
  }, [tournamentId, player1Id, player2Id, loadComparison])

  const h2hResults = useMemo<PlayerComparisonHeadToHeadResult[]>(() => {
    if (data?.headToHead?.length) {
      return [...data.headToHead]
        .sort((a, b) => b.matchweek - a.matchweek || b.matchId - a.matchId)
        .slice(0, 5)
    }

    // Backward-compatible fallback for older API payloads.
    const results: PlayerComparisonHeadToHeadResult[] = []
    for (const m of matches) {
      if (!m.played || m.score1 == null || m.score2 == null) continue
      const t1Has1 = m.team1.includes(player1Id)
      const t1Has2 = m.team1.includes(player2Id)
      const t2Has1 = m.team2.includes(player1Id)
      const t2Has2 = m.team2.includes(player2Id)

      // Same team — skip
      if ((t1Has1 && t1Has2) || (t2Has1 && t2Has2)) continue
      // Must be on opposite teams
      if (!((t1Has1 && t2Has2) || (t1Has2 && t2Has1))) continue

      const p1InTeam1 = t1Has1
      const p1Score = p1InTeam1 ? m.score1 : m.score2
      const p2Score = p1InTeam1 ? m.score2 : m.score1
      const p1Partner = p1InTeam1
        ? m.team1.find(id => id !== player1Id) || ''
        : m.team2.find(id => id !== player1Id) || ''
      const p2Partner = p1InTeam1
        ? m.team2.find(id => id !== player2Id) || ''
        : m.team1.find(id => id !== player2Id) || ''

      results.push({
        matchId: Number(m.id) || 0,
        source: 'shuffle',
        sourceLabel: 'Shuffle',
        matchweek: m.matchweek,
        division: m.division,
        divisionLabel: null,
        p1PartnerId: p1Partner,
        p2PartnerId: p2Partner,
        p1PartnerName: getPlayerById(p1Partner)?.name || '?',
        p2PartnerName: getPlayerById(p2Partner)?.name || '?',
        p1Score,
        p2Score,
        winner: p1Score > p2Score ? 'p1' : p2Score > p1Score ? 'p2' : 'draw',
      })
    }
    return results
      .sort((a, b) => b.matchweek - a.matchweek || b.matchId - a.matchId)
      .slice(0, 5)
  }, [data?.headToHead, matches, player1Id, player2Id, getPlayerById])

  const h2hSummary = useMemo(() => {
    if (data?.headToHeadTotals) return data.headToHeadTotals

    const p1Wins = h2hResults.filter(r => r.winner === 'p1').length
    const p2Wins = h2hResults.filter(r => r.winner === 'p2').length
    const draws = h2hResults.filter(r => r.winner === 'draw').length
    return {
      p1Wins,
      p2Wins,
      draws,
      total: h2hResults.length,
      p1Losses: p2Wins,
      p2Losses: p1Wins,
    }
  }, [data?.headToHeadTotals, h2hResults])

  const s1 = data?.player1
  const s2 = data?.player2

  const radarData = useMemo(() => {
    if (!s1 || !s2) return []
    const maxPts = Math.max(s1.points, s2.points, 1)
    const maxGames = Math.max(s1.totalGames, s2.totalGames, 1)
    return [
      { stat: 'Win Rate', p1: s1.winRate, p2: s2.winRate },
      {
        stat: 'Vitórias',
        p1: Math.round((s1.wins / maxGames) * 100),
        p2: Math.round((s2.wins / maxGames) * 100),
      },
      {
        stat: 'Pontos',
        p1: Math.round((s1.points / maxPts) * 100),
        p2: Math.round((s2.points / maxPts) * 100),
      },
      {
        stat: 'Pts/Jornada',
        p1: Math.min(
          100,
          Math.round(
            (s1.avgPointsPerMatchweek /
              Math.max(s1.avgPointsPerMatchweek, s2.avgPointsPerMatchweek, 1)) *
              100
          )
        ),
        p2: Math.min(
          100,
          Math.round(
            (s2.avgPointsPerMatchweek /
              Math.max(s1.avgPointsPerMatchweek, s2.avgPointsPerMatchweek, 1)) *
              100
          )
        ),
      },
      {
        stat: 'Consistência',
        p1: s1.totalGames > 0 ? Math.round(((s1.wins + s1.draws) / s1.totalGames) * 100) : 0,
        p2: s2.totalGames > 0 ? Math.round(((s2.wins + s2.draws) / s2.totalGames) * 100) : 0,
      },
      {
        stat: 'Melhor Div',
        p1: s1.highestDivision > 0 ? Math.round((1 - (s1.highestDivision - 1) / 5) * 100) : 0,
        p2: s2.highestDivision > 0 ? Math.round((1 - (s2.highestDivision - 1) / 5) * 100) : 0,
      },
    ]
  }, [s1, s2])

  const chartData = useMemo(() => {
    if (!s1 || !s2) return []
    const maxMw = Math.max(...s1.snapshots.map(s => s.matchweek), ...s2.snapshots.map(s => s.matchweek), 0)
    const result = []

    for (let mw = 1; mw <= maxMw; mw++) {
      const snap1 = s1.snapshots.find(s => s.matchweek === mw)
      const snap2 = s2.snapshots.find(s => s.matchweek === mw)
      result.push({
        mw: `JW${mw}`,
        [`${s1.player.name} Pts`]: snap1?.points || 0,
        [`${s2.player.name} Pts`]: snap2?.points || 0,
        [`${s1.player.name} Pos`]: snap1?.position || null,
        [`${s2.player.name} Pos`]: snap2?.position || null,
      })
    }

    return result
  }, [s1, s2])

  if (!s1 || !s2 || !data) {
    return (
      <div className="c-player-compare-modal" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="c-player-compare c-player-compare--loading">
          <div className="c-player-compare__header">
            <strong className="c-player-compare__title">Comparação de Jogadores</strong>
            <button className="c-player-compare__close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="c-player-compare__loading-text">{loadError ?? 'A carregar comparação...'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="c-player-compare-modal" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="c-player-compare">
        <div className="c-player-compare__header">
          <button className="c-player-compare__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="c-player-compare__body">
          <div className={`c-player-compare__stats-grid ${isMobile ? 'is-mobile' : ''}`}>
            <PlayerCard stats={s1} color={COLORS.p1} align="left" getPlayerById={getPlayerById} />

            {!isMobile && (
              <div className="c-player-compare__radar-card">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#d9e2e4" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#4d4d4d', fontSize: 10 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar name={s1.player.name} dataKey="p1" stroke={COLORS.p1} fill={COLORS.p1} fillOpacity={0.2} strokeWidth={2} />
                    <Radar name={s2.player.name} dataKey="p2" stroke={COLORS.p2} fill={COLORS.p2} fillOpacity={0.2} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <PlayerCard stats={s2} color={COLORS.p2} align="left" getPlayerById={getPlayerById} />
          </div>

          {isMobile && (
            <div className="c-player-compare__radar-card c-player-compare__radar-card--mobile">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d9e2e4" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: '#4d4d4d', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar name={s1.player.name} dataKey="p1" stroke={COLORS.p1} fill={COLORS.p1} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name={s2.player.name} dataKey="p2" stroke={COLORS.p2} fill={COLORS.p2} fillOpacity={0.2} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* H2H Section */}
          <div className="c-player-compare__h2h">
            <h4 className="c-player-compare__chart-title" style={{ textAlign: 'center', marginBottom: '12px' }}>
              Head to Head
            </h4>
            {h2hSummary.total === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>
                Sem confrontos diretos
              </p>
            ) : (
              <>
                <div className="c-player-compare__h2h-summary">
                  <span className="c-player-compare__h2h-count" style={{ color: COLORS.p1 }}>
                    {h2hSummary.p1Wins}
                  </span>
                  <span className="c-player-compare__h2h-label">
                    {h2hSummary.draws > 0 && (
                      <span style={{ color: '#888' }}>{h2hSummary.draws}E</span>
                    )}
                    <span style={{ color: '#aaa', fontSize: '11px', margin: '0 6px' }}>
                      ({h2hSummary.total} jogos)
                    </span>
                  </span>
                  <span className="c-player-compare__h2h-count" style={{ color: COLORS.p2 }}>
                    {h2hSummary.p2Wins}
                  </span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#777', marginBottom: '8px' }}>
                  {s1.player.name}: {h2hSummary.p1Wins}V / {h2hSummary.draws}E / {h2hSummary.p1Losses}D
                  {' · '}
                  {s2.player.name}: {h2hSummary.p2Wins}V / {h2hSummary.draws}E / {h2hSummary.p2Losses}D
                </div>

                <div className="c-player-compare__h2h-bar">
                  {h2hSummary.p1Wins > 0 && (
                    <div
                      className="c-player-compare__h2h-bar-seg"
                      style={{
                        flex: h2hSummary.p1Wins,
                        background: COLORS.p1,
                        borderRadius: h2hSummary.p2Wins === 0 && h2hSummary.draws === 0 ? '4px' : '4px 0 0 4px',
                      }}
                    />
                  )}
                  {h2hSummary.draws > 0 && (
                    <div
                      className="c-player-compare__h2h-bar-seg"
                      style={{ flex: h2hSummary.draws, background: '#888' }}
                    />
                  )}
                  {h2hSummary.p2Wins > 0 && (
                    <div
                      className="c-player-compare__h2h-bar-seg"
                      style={{
                        flex: h2hSummary.p2Wins,
                        background: COLORS.p2,
                        borderRadius: h2hSummary.p1Wins === 0 && h2hSummary.draws === 0 ? '4px' : '0 4px 4px 0',
                      }}
                    />
                  )}
                </div>

                <div className="c-player-compare__h2h-matches">
                  {h2hResults.map((r, i) => {
                    return (
                      <div key={i} className="c-player-compare__h2h-match">
                        <span className="c-player-compare__h2h-mw">
                          {r.sourceLabel} · JW{r.matchweek} · {r.divisionLabel || `D${r.division}`}
                        </span>
                        <span className="c-player-compare__h2h-teams">
                          <span style={{ color: COLORS.p1, fontWeight: r.winner === 'p1' ? 700 : 400 }}>
                            {s1.player.name} & {r.p1PartnerName || '?'}
                          </span>
                          <span
                            className="c-player-compare__h2h-score"
                            style={{
                              color: r.winner === 'draw' ? '#888' : r.winner === 'p1' ? COLORS.p1 : COLORS.p2,
                            }}
                          >
                            {r.p1Score} - {r.p2Score}
                          </span>
                          <span style={{ color: COLORS.p2, fontWeight: r.winner === 'p2' ? 700 : 400 }}>
                            {s2.player.name} & {r.p2PartnerName || '?'}
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {chartData.length > 0 && (
            <div className={`c-player-compare__charts-grid ${isMobile ? 'is-mobile' : ''}`}>
              <div className="c-player-compare__chart-card">
                <h4 className="c-player-compare__chart-title">Evolução de Pontos</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e4" />
                    <XAxis dataKey="mw" tick={{ fill: '#4d4d4d', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#4d4d4d', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '6px', color: '#281e1e' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${s1.player.name} Pts`} stroke={COLORS.p1} strokeWidth={2} dot={{ fill: COLORS.p1, r: 3 }} />
                    <Line type="monotone" dataKey={`${s2.player.name} Pts`} stroke={COLORS.p2} strokeWidth={2} dot={{ fill: COLORS.p2, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="c-player-compare__chart-card">
                <h4 className="c-player-compare__chart-title">Evolução da Posição</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e4" />
                    <XAxis dataKey="mw" tick={{ fill: '#4d4d4d', fontSize: 11 }} />
                    <YAxis reversed domain={[1, data.totalPlayers || playersCount || 48]} tick={{ fill: '#4d4d4d', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '6px', color: '#281e1e' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${s1.player.name} Pos`} stroke={COLORS.p1} strokeWidth={2} dot={{ fill: COLORS.p1, r: 3 }} />
                    <Line type="monotone" dataKey={`${s2.player.name} Pos`} stroke={COLORS.p2} strokeWidth={2} dot={{ fill: COLORS.p2, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
