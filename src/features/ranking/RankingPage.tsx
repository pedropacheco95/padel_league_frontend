// Ranking with "why": tap a player to see each competition's contribution and whether it counts.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import PointsValue from '@/components/v2/PointsValue'
import { useCurrentRanking, useRankingExplanation } from './api'

function Movement({ position, previous }: { position: number; previous?: number | null }) {
  if (!previous || previous === position) return <span className="text-[12px] text-gray-400 w-[24px] text-center">–</span>
  const up = previous > position
  return (
    <span className="text-[12px] font-semibold w-[24px] text-center" style={{ color: up ? '#16a34a' : '#dc2626' }} title={`Antes: ${previous}º`}>
      {up ? '▲' : '▼'}{Math.abs(previous - position)}
    </span>
  )
}

function Explanation({ playerId }: { playerId: number }) {
  const { data, isLoading, isError } = useRankingExplanation(playerId)
  if (isLoading) return <p className="text-[13px] text-gray-500 py-[8px]">A carregar…</p>
  if (isError || !data) return <p className="text-[13px] text-gray-500 py-[8px]">Sem detalhe disponível.</p>
  const lines = data.lines ?? []
  return (
    <div className="bg-gray-50 rounded-[8px] p-[10px] my-[6px]">
      {lines.length === 0 && <p className="text-[13px] text-gray-500">Sem competições contabilizadas.</p>}
      {lines.map((l, i) => (
        <div key={i} className={`flex items-center justify-between gap-[8px] py-[6px] border-b border-gray-200 last:border-b-0 ${l.counted ? '' : 'opacity-50'}`}>
          <div className="min-w-0 flex flex-col gap-[2px]">
            <div className="flex items-center gap-[6px] min-w-0">
              {l.competition && <FormatBadge competition={l.competition} />}
              {l.competition ? (
                <Link to={`/competitions/${l.competition.id}`} className="text-[14px] truncate underline" style={{ color: 'inherit' }}>
                  {l.competition.name}{l.stageNumber && l.competition.format === 'teams' ? ` · MT${l.stageNumber}` : ''}
                </Link>
              ) : null}
            </div>
            <span className="text-[12px] text-gray-500">
              {l.place ? `${l.place}º lugar` : ''}
              {l.bonusPoints ? ` · bónus ${l.bonusPoints}` : ''}
              {!l.counted ? ' · não conta' : ''}
              {l.reason ? ` · ${l.reason}` : ''}
            </span>
          </div>
          <PointsValue value={(l.placePoints ?? 0) + (l.bonusPoints ?? 0)} digits={2} className={`text-[14px] tabular-nums ${l.counted ? 'font-semibold' : 'line-through'}`} />
        </div>
      ))}
      <div className="flex justify-between pt-[8px] text-[14px] font-bold">
        <span>Total</span>
        <PointsValue value={data.total} digits={2} />
      </div>
    </div>
  )
}

export default function RankingPage() {
  const { data, isLoading, isError } = useCurrentRanking()
  const [open, setOpen] = useState<number | null>(null)

  if (isLoading) return <div className="loader" />
  if (isError || !data) return <p className="text-center text-[15px] py-[40px]">Não foi possível carregar o ranking.</p>

  return (
    <div className="l-grid">
      <div className="max-w-[700px] mx-auto w-full px-[16px] py-[16px]">
        <h1 className="text-[24px] font-bold text-center">Ranking</h1>
        <p className="text-[13px] text-gray-500 text-center mb-[16px]">
          {data.rule?.name ?? ''}{data.rule?.name ? ' · ' : ''}Atualizado a {new Date(data.computedAt).toLocaleDateString('pt-PT')}
        </p>
        <ol className="u-list-clean flex flex-col">
          {data.entries.map((e) => (
            <li key={e.player.id} className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => setOpen(open === e.player.id ? null : e.player.id)}
                className="w-full flex items-center gap-[10px] py-[10px] text-left bg-transparent"
                aria-expanded={open === e.player.id}
              >
                <span className="w-[32px] text-[16px] font-bold text-right">{e.position}º</span>
                <Movement position={e.position} previous={e.previousPosition} />
                <PlayerAvatar player={e.player} size={36} withName link={false} />
                <span className="ml-auto text-[16px] font-semibold tabular-nums"><PointsValue value={e.points} digits={0} /></span>
                <span className="text-[12px] text-gray-400 w-[14px]">{open === e.player.id ? '▾' : '▸'}</span>
              </button>
              {open === e.player.id && (
                <>
                  <Explanation playerId={e.player.id} />
                  <Link to={`/players/${e.player.id}`} className="text-[13px] underline block mb-[8px]" style={{ color: '#006A71' }}>Ver jogador</Link>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
