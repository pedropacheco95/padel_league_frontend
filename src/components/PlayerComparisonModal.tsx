import { useEffect, useMemo, useState } from 'react'
import {
  Player,
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
  onClose: () => void
  getPlayerById: (id: string) => Player | undefined
}

export default function PlayerComparisonModal({
  tournamentId,
  player1Id,
  player2Id,
  playersCount,
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

    shuffleTournamentApi
      .playerComparison({ tournamentId, player1Id, player2Id })
      .then(({ data }) => {
        if (isActive) setData(data)
      })
      .catch(() => {
        if (isActive) setLoadError('Não foi possível carregar a comparação dos jogadores.')
      })

    return () => {
      isActive = false
    }
  }, [tournamentId, player1Id, player2Id])

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
