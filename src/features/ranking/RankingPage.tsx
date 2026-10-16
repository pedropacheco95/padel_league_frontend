// Ranking with "why": tap a player to see each competition's contribution and whether it counts.
// A toggle (?view=subs) swaps in the substitutes' ranking, drawn in amber so it can't be mistaken for the main one.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import PointsValue from '@/components/v2/PointsValue'
import { useCurrentRanking, useRankingExplanation } from './api'
import { useSubsRanking } from './subs'

const SUBS_ACCENT = '#92400e'
const SUBS_BG = '#fef3c7'

function SubsMarker() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[11px] font-bold px-[6px] h-[18px] shrink-0"
      style={{ background: SUBS_BG, color: SUBS_ACCENT }}
      title="Pontos sobretudo como substituto"
      aria-label="Pontos sobretudo como substituto"
    >
      SUB
    </span>
  )
}

function ViewToggle({ subs, onChange }: { subs: boolean; onChange: (subs: boolean) => void }) {
  const opt = (on: boolean, label: string, value: boolean, accent: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={() => onChange(value)}
      className="flex-1 min-h-[40px] rounded-full text-[14px] font-semibold"
      style={on ? { background: accent, color: '#fff' } : { background: 'transparent', color: '#374151' }}
    >
      {label}
    </button>
  )
  return (
    <div role="tablist" className="flex gap-[4px] p-[4px] rounded-full bg-gray-100 max-w-[360px] mx-auto mb-[16px]">
      {opt(!subs, 'Principal', false, '#006A71')}
      {opt(subs, 'Substitutos', true, SUBS_ACCENT)}
    </div>
  )
}

function SubsRankingList() {
  const { data, isLoading, isError } = useSubsRanking(true)
  if (isLoading) return <div className="loader" />
  if (isError) return <p className="text-center text-[15px] py-[24px]">Não foi possível carregar o ranking de substitutos.</p>
  const entries = data?.entries ?? []
  return (
    <section className="rounded-[12px] overflow-hidden border" style={{ borderColor: SUBS_ACCENT }}>
      <header className="px-[14px] py-[10px]" style={{ background: SUBS_ACCENT, color: '#fff' }}>
        <h2 className="text-[18px] font-bold">Substitutos</h2>
        {data?.competition && (
          <p className="text-[12px]" style={{ color: SUBS_BG }}>Pontos de substituto na {data.competition.name}</p>
        )}
      </header>
      {entries.length === 0 && <p className="text-[14px] text-center py-[16px]">Ainda sem substituições.</p>}
      <ol className="u-list-clean flex flex-col" style={{ background: '#fffbeb' }}>
        {entries.map((e) => (
          <li key={e.player.id} className="border-b last:border-b-0" style={{ borderColor: '#fde68a' }}>
            <Link to={`/players/${e.player.id}`} className="flex items-center gap-[10px] min-h-[52px] px-[10px]" style={{ color: 'inherit' }}>
              <span className="w-[32px] text-[16px] font-bold text-right" style={{ color: SUBS_ACCENT }}>{e.position}º</span>
              <PlayerAvatar player={e.player} size={36} withName link={false} />
              {e.isExternal && <span className="text-[11px] text-gray-600 shrink-0">externo</span>}
              <span className="ml-auto flex flex-col items-end">
                <span className="text-[16px] font-semibold tabular-nums"><PointsValue value={e.points} digits={0} /></span>
                <span className="text-[12px] text-gray-600">{e.appearances} {e.appearances === 1 ? 'jogo' : 'jogos'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Movement({ position, previous }: { position: number; previous?: number | null }) {
  if (!previous || previous === position) return <span className="text-[12px] text-gray-400 w-[24px] text-center">–</span>
  const up = previous > position
  return (
    <span className="text-[12px] font-semibold w-[24px] text-center" style={{ color: up ? '#15803d' : '#dc2626' }} title={`Antes: ${previous}º`}>
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
  const [params, setParams] = useSearchParams()
  const subs = params.get('view') === 'subs'
  const { data, isLoading, isError } = useCurrentRanking()
  const [open, setOpen] = useState<number | null>(null)
  const setSubs = (on: boolean) => setParams(on ? { view: 'subs' } : {}, { replace: true })

  if (subs) {
    return (
      <div className="l-grid">
        <div className="max-w-[700px] mx-auto w-full px-[16px] py-[16px]">
          <h1 className="text-[24px] font-bold text-center mb-[12px]">Ranking</h1>
          <ViewToggle subs onChange={setSubs} />
          <SubsRankingList />
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="loader" />
  if (isError || !data) return <p className="text-center text-[15px] py-[40px]">Não foi possível carregar o ranking.</p>
  const entries = data.entries
  const anyFromSubs = entries.some((e) => e.fromSubs)

  return (
    <div className="l-grid">
      <div className="max-w-[700px] mx-auto w-full px-[16px] py-[16px]">
        <h1 className="text-[24px] font-bold text-center mb-[12px]">Ranking</h1>
        <ViewToggle subs={false} onChange={setSubs} />
        <p className="text-[13px] text-gray-500 text-center mb-[16px]">
          {data.rule?.name ?? ''}{data.rule?.name ? ' · ' : ''}Atualizado a {new Date(data.computedAt).toLocaleDateString('pt-PT')}
        </p>
        {anyFromSubs && (
          <p className="text-[12px] text-gray-600 text-center mb-[12px] flex items-center justify-center gap-[6px]">
            <SubsMarker /> pontos sobretudo como substituto
          </p>
        )}
        <ol className="u-list-clean flex flex-col">
          {entries.map((e) => (
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
                {e.fromSubs && <SubsMarker />}
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
