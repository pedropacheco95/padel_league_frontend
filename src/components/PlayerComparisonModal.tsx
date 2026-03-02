import { useEffect, useMemo, useState } from 'react'
import { Player } from '@/types/tournament'
import { shuffleTournamentApi } from '@/api/shuffleTournament'
import { X } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'

interface MatchResult {
  matchweek: number
  division: number
  partnerId: string
  opponentIds: [string, string]
  teamScore: number
  oppScore: number
  won: boolean
  drew: boolean
}

interface PlayerStats {
  player: Player
  wins: number
  draws: number
  losses: number
  winRate: number
  totalGames: number
  points: number
  bestWinDiff: number
  worstLossDiff: number
  currentStreak: { type: 'W' | 'D' | 'L'; count: number }
  divisionsPlayed: number[]
  highestDivision: number
  lowestDivision: number
  biggestWins: MatchResult[]
  worstLosses: MatchResult[]
  avgPointsPerMatchweek: number
  snapshots: { matchweek: number; points: number; position: number }[]
}

interface PlayerComparisonResponse {
  tournamentId: number
  totalPlayers: number
  player1: PlayerStats
  player2: PlayerStats
}

const COLORS = {
  p1: '#06b6d4', // cyan primary
  p2: '#eab308', // yellow accent
}

function StatItem({ label, value, color, align }: { label: string; value: string | number; color?: string; align: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: '6px', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontWeight: 700, fontSize: '1.4rem', color: color || '#e2e8f0', minWidth: '28px', textAlign: 'left' }}>{value}</span>
      <span style={{ fontSize: '1.05rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function PlayerCard({ stats, color, align, getPlayerById }: { stats: PlayerStats; color: string; align: 'left' | 'right'; getPlayerById: (id: string) => Player | undefined }) {
  const streakEmoji = stats.currentStreak.type === 'W' ? '🔥' : stats.currentStreak.type === 'D' ? '➖' : '❄️'
  const streakLbl = stats.currentStreak.type === 'W' ? 'V' : stats.currentStreak.type === 'D' ? 'E' : 'D'

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3 style={{ fontWeight: 700, fontSize: '1.5rem', color, marginBottom: '10px', textAlign: 'left' }}>{stats.player.name}</h3>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
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
        <StatItem label="Melhor Res." value={stats.bestWinDiff > 0 ? `+${stats.bestWinDiff}` : '-'} color="#22c55e" align={align} />
        <StatItem label="Pior Res." value={stats.worstLossDiff > 0 ? `-${stats.worstLossDiff}` : '-'} color="#ef4444" align={align} />
      </div>

      {/* Biggest wins */}
      {stats.biggestWins.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#22c55e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: align }}>Maiores Vitórias</div>
          {stats.biggestWins.map((r, i) => <MatchResultBadge key={i} result={r} getPlayerById={getPlayerById} />)}
        </div>
      )}

      {/* Worst losses */}
      {stats.worstLosses.length > 0 && (
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: align }}>Piores Derrotas</div>
          {stats.worstLosses.map((r, i) => <MatchResultBadge key={i} result={r} getPlayerById={getPlayerById} />)}
        </div>
      )}
    </div>
  )
}

function MatchResultBadge({ result, getPlayerById }: { result: MatchResult; getPlayerById: (id: string) => Player | undefined }) {
  const opp1 = getPlayerById(result.opponentIds[0])
  const opp2 = getPlayerById(result.opponentIds[1])
  return (
    <div style={{ fontSize: '1.1rem', padding: '3px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginBottom: '3px' }}>
      <span style={{ color: result.won ? '#22c55e' : result.drew ? '#eab308' : '#ef4444', fontWeight: 700 }}>
        {result.teamScore}-{result.oppScore}
      </span>
      <span style={{ color: '#64748b', marginLeft: '6px' }}>
        vs {opp1?.name || '?'} & {opp2?.name || '?'}
      </span>
      <span style={{ color: '#475569', marginLeft: '4px', fontSize: '1rem' }}>JW{result.matchweek}</span>
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
  tournamentId, player1Id, player2Id, playersCount, onClose, getPlayerById,
}: Props) {
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

  console.log(data)

  const s1 = data?.player1
  const s2 = data?.player2

  // Radar data – normalize to 0-100
  const radarData = useMemo(() => {
    if (!s1 || !s2) return []
    const maxPts = Math.max(s1.points, s2.points, 1)
    const maxGames = Math.max(s1.totalGames, s2.totalGames, 1)
    return [
      { stat: 'Win Rate', p1: s1.winRate, p2: s2.winRate },
      { stat: 'Vitórias', p1: Math.round(s1.wins / maxGames * 100), p2: Math.round(s2.wins / maxGames * 100) },
      { stat: 'Pontos', p1: Math.round(s1.points / maxPts * 100), p2: Math.round(s2.points / maxPts * 100) },
      { stat: 'Pts/Jornada', p1: Math.min(100, Math.round(s1.avgPointsPerMatchweek / Math.max(s1.avgPointsPerMatchweek, s2.avgPointsPerMatchweek, 1) * 100)), p2: Math.min(100, Math.round(s2.avgPointsPerMatchweek / Math.max(s1.avgPointsPerMatchweek, s2.avgPointsPerMatchweek, 1) * 100)) },
      { stat: 'Consistência', p1: s1.totalGames > 0 ? Math.round(((s1.wins + s1.draws) / s1.totalGames) * 100) : 0, p2: s2.totalGames > 0 ? Math.round(((s2.wins + s2.draws) / s2.totalGames) * 100) : 0 },
      { stat: 'Melhor Div', p1: s1.highestDivision > 0 ? Math.round((1 - (s1.highestDivision - 1) / 5) * 100) : 0, p2: s2.highestDivision > 0 ? Math.round((1 - (s2.highestDivision - 1) / 5) * 100) : 0 },
    ]
  }, [s1, s2])

  // Chart data
  const chartData = useMemo(() => {
    if (!s1 || !s2) return []
    const maxMw = Math.max(
      ...s1.snapshots.map(s => s.matchweek),
      ...s2.snapshots.map(s => s.matchweek),
      0
    )
    const data = []
    for (let mw = 1; mw <= maxMw; mw++) {
      const snap1 = s1.snapshots.find(s => s.matchweek === mw)
      const snap2 = s2.snapshots.find(s => s.matchweek === mw)
      data.push({
        mw: `JW${mw}`,
        [`${s1.player.name} Pts`]: snap1?.points || 0,
        [`${s2.player.name} Pts`]: snap2?.points || 0,
        [`${s1.player.name} Pos`]: snap1?.position || null,
        [`${s2.player.name} Pos`]: snap2?.position || null,
      })
    }
    return data
  }, [s1, s2])

  if (!s1 || !s2 || !data) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '20px 10px',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          style={{
            background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 15%, 22%)',
            borderRadius: '12px', width: '100%', maxWidth: '700px',
            color: 'hsl(210, 20%, 95%)', position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '1.4rem' }}>Comparação de Jogadores</strong>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>
            {loadError ?? 'A carregar comparação...'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '20px 10px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 15%, 22%)',
          borderRadius: '12px', width: '100%', maxWidth: '1100px',
          color: 'hsl(210, 20%, 95%)', position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid hsl(220, 15%, 22%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.6rem', color: COLORS.p1 }}>{s1.player.name}</span>
            <span style={{ fontSize: '1.3rem', color: '#475569', fontWeight: 700, letterSpacing: '1px' }}>VS</span>
            <span style={{ fontWeight: 700, fontSize: '1.6rem', color: COLORS.p2 }}>{s2.player.name}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* 3-column layout: Player1 stats | Radar | Player2 stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'start', marginBottom: '20px' }}>
            {/* Left – Player 1 */}
            <PlayerCard stats={s1} color={COLORS.p1} align="right" getPlayerById={getPlayerById} />

            {/* Center – Radar */}
            <div style={{ width: '320px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', alignSelf: 'center' }}>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(220, 15%, 22%)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar name={s1.player.name} dataKey="p1" stroke={COLORS.p1} fill={COLORS.p1} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name={s2.player.name} dataKey="p2" stroke={COLORS.p2} fill={COLORS.p2} fillOpacity={0.2} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Right – Player 2 */}
            <PlayerCard stats={s2} color={COLORS.p2} align="left" getPlayerById={getPlayerById} />
          </div>

          {/* Charts below */}
          {chartData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolução de Pontos</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                    <XAxis dataKey="mw" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 14%)', border: '1px solid hsl(220, 15%, 22%)', borderRadius: '6px', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${s1.player.name} Pts`} stroke={COLORS.p1} strokeWidth={2} dot={{ fill: COLORS.p1, r: 3 }} />
                    <Line type="monotone" dataKey={`${s2.player.name} Pts`} stroke={COLORS.p2} strokeWidth={2} dot={{ fill: COLORS.p2, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolução da Posição</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                    <XAxis dataKey="mw" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis reversed domain={[1, data.totalPlayers || playersCount || 48]} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 14%)', border: '1px solid hsl(220, 15%, 22%)', borderRadius: '6px', color: '#e2e8f0' }} />
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
