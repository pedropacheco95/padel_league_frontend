import MatchCard from '@/components/v2/MatchCard'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import { formatPoints } from '@/components/v2/PointsValue'
import type { PlayerSummary } from '@/api/v2'
import { useV2PlayerComparison } from './api'


function Side({ p }: { p?: PlayerSummary }) {
  return (
    <div className="flex flex-col items-center gap-[4px] min-w-0 flex-1 text-center">
      <PlayerAvatar player={p} size={56} withName />
      <span className="text-[13px] text-gray-500">
        #{p?.rankingPosition ?? '—'} · {formatPoints(p?.rankingPoints, 0)} pts
      </span>
    </div>
  )
}

export default function PlayerCompare({ a, b }: { a: number; b: number }) {
  const { data, isLoading, error } = useV2PlayerComparison(a, b)

  if (isLoading) return <div className="loader" />
  if (error || !data) return <p className="text-center text-[15px] py-[16px]">Não foi possível carregar a comparação.</p>

  const h = data.headToHead ?? {}
  const aW = h.aWins ?? 0
  const bW = h.bWins ?? 0
  const dr = h.draws ?? 0
  const total = aW + bW + dr
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  const t = data.together ?? {}
  const matches = data.matches ?? []

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-start justify-between gap-[12px]">
        <Side p={data.a} />
        <Side p={data.b} />
      </div>

      <section>
        <h3 className="text-[16px] font-semibold mb-[8px] text-center">Frente a frente</h3>
        {total === 0 ? (
          <p className="text-center text-[14px] text-gray-500">Sem confrontos diretos</p>
        ) : (
          <>
            <p className="text-center text-[18px] tabular-nums font-bold">
              {aW} – {dr} – {bW}
            </p>
            <p className="text-center text-[12px] text-gray-500 mb-[8px]">{h.played ?? total} jogos</p>
            <div className="flex h-[12px] w-full overflow-hidden rounded-full bg-gray-100">
              <div style={{ width: `${pct(aW)}%`, backgroundColor: '#006A71' }} />
              <div style={{ width: `${pct(dr)}%`, backgroundColor: '#9ca3af' }} />
              <div style={{ width: `${pct(bW)}%`, backgroundColor: '#f59e0b' }} />
            </div>
          </>
        )}
      </section>

      <section>
        <h3 className="text-[16px] font-semibold mb-[8px] text-center">Juntos</h3>
        {(t.played ?? 0) === 0 ? (
          <p className="text-center text-[14px] text-gray-500">Nunca jogaram juntos</p>
        ) : (
          <p className="text-center text-[14px]">
            {t.played} jogos · {t.wins ?? 0} vitórias · {t.draws ?? 0} empates · {t.losses ?? 0} derrotas
          </p>
        )}
      </section>

      <section>
        <h3 className="text-[16px] font-semibold mb-[8px] text-center">Jogos</h3>
        {matches.length === 0 ? (
          <p className="text-center text-[14px] text-gray-500">Sem confrontos diretos</p>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {matches.map((m) => <MatchCard key={m.id} match={m} showGroup />)}
          </div>
        )}
      </section>
    </div>
  )
}
