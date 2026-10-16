// Pair formation on the Teams page: the live division projection (Divisões while pairs form) and the
// partner simulator (Simulador). Pedro's design boards "Divisões MT2 — projeção" and "Simulador de parceiro".
import { useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { formatPoints } from '@/components/v2/PointsValue'
import { useAuth } from '@/context/AuthContext'
import { errorMessage } from '@/features/results/api'
import { teamsV2Api } from './api'
import type { ProjectedDivision, ProjectedPair, RankedPlayer, SimulationCandidate } from './projection'

const TEAL = '#006A71'

const deadlineFormat = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
})
function deadlineText(iso: string | null) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return null
  // "domingo, 18/10, 23:59" → "Domingo, 18/10 · 23:59"
  const s = deadlineFormat.format(d).replace(/, (\d{2}:\d{2})$/, ' · $1')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const projectionKey = (competitionId: number) => ['v2', 'competitions', competitionId, 'teams', 'projection'] as const

const pts = (n?: number | null) => formatPoints(n ?? 0)

function PointsChip({ value }: { value?: number | null }) {
  return <span className="ml-[6px] rounded-full bg-gray-100 px-[6px] py-[1px] text-[11px] font-semibold tabular-nums text-gray-700">{pts(value)}</span>
}

function pairStyle(p: ProjectedPair) {
  if (p.mine) return 'border-2 border-orange-600 bg-orange-50'
  if (p.provisional) return 'border border-dashed border-gray-400 bg-gray-50'
  return 'border border-[#006A71] bg-[#E6F2F3]'
}

function PairRow({ pair }: { pair: ProjectedPair }) {
  const slots = pair.unpairedSlots?.length ? pair.unpairedSlots.map(n => `${n}.º`).join(' + ') : null
  return (
    <li className={`rounded-[6px] px-[10px] py-[8px] ${pairStyle(pair)}`}>
      <div className="flex items-center gap-[10px]">
        <span className="w-[14px] text-[15px] font-bold text-gray-700">{pair.seed}</span>
        <div className="min-w-0 flex-1 text-[14px] leading-[20px]">
          {pair.players.map(p => (
            <div key={p.id} className="flex items-center">
              <span className={`truncate ${pair.provisional && !pair.mine ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{p.name}</span>
              <PointsChip value={p.rankingPoints} />
            </div>
          ))}
        </div>
        <span className={`text-[20px] font-bold tabular-nums ${pair.provisional && !pair.mine ? 'text-gray-600' : 'text-[#006A71]'}`}>{pts(pair.sum)}</span>
      </div>
      {pair.provisional && (
        <p className="mt-[4px] text-[12px] text-gray-600">Por ranking{slots ? ` · ${slots} sem parelha` : ''}</p>
      )}
      {pair.pending?.map(d => (
        <p key={`${d.from.id}-${d.to.id}`} className="mt-[4px] text-[12px] font-semibold text-orange-800">
          {d.from.name} declarou {d.to.name} — aguarda resposta
        </p>
      ))}
    </li>
  )
}

export function DivisionCards({ divisions }: { divisions: ProjectedDivision[] }) {
  return (
    <div className="grid gap-[12px] md:grid-cols-2 xl:grid-cols-3">
      {divisions.map(d => (
        <section key={d.tier} className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
          <header className="flex items-baseline justify-between gap-[8px] px-[12px] py-[8px] text-white" style={{ background: TEAL }}>
            <h4 className="!text-[16px] font-bold !text-white">{d.name}</h4>
            <span className="text-[12px]">Rating {pts(d.rating)} · soma {pts(d.minSum)}–{pts(d.maxSum)}</span>
          </header>
          <ol className="space-y-[6px] p-[8px]">
            {d.pairs.map(p => <PairRow key={p.players.map(x => x.id).join('-')} pair={p} />)}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Legend({ mine }: { mine?: boolean }) {
  const box = 'inline-block h-[14px] w-[18px] rounded-[3px] align-[-2px]'
  return (
    <ul className="flex flex-wrap gap-x-[14px] gap-y-[4px] text-[12px] text-gray-700">
      {mine && <li><span className={`${box} border-2 border-orange-600 bg-orange-50`} /> A tua parelha</li>}
      <li><span className={`${box} border border-[#006A71] bg-[#E6F2F3]`} /> Confirmada</li>
      <li><span className={`${box} border border-dashed border-gray-400 bg-gray-50`} /> Por ranking (provisória)</li>
    </ul>
  )
}

export function DivisionsProjection({ competitionId, onSimulate }: { competitionId: number; onSimulate?: () => void }) {
  const q = useQuery({ queryKey: projectionKey(competitionId), queryFn: () => teamsV2Api.projection(competitionId), refetchInterval: 60_000 })
  if (q.isError) return <p className="text-[14px] text-red-700">{errorMessage(q.error, 'Não foi possível carregar a projeção.')}</p>
  if (!q.data) return <p className="text-[14px] text-gray-600">A carregar…</p>
  const { stage, counts, divisions } = q.data
  const deadline = deadlineText(stage.pairingDeadline)
  const card = 'rounded-[8px] border bg-white px-[12px] py-[10px]'
  return (
    <div className="space-y-[16px]">
      <div>
        <h3 className="!text-[19px] font-semibold">Projeção das divisões · Mini-torneio {stage.number}</h3>
        <p className="mt-[6px] text-[14px] text-gray-700">
          As divisões atualizam-se à medida que as parelhas são confirmadas. As parelhas a tracejado ainda não existem: foram
          calculadas juntando os jogadores sem parelha pela ordem do ranking, e mudam sempre que alguém confirma.
        </p>
      </div>
      {deadline && (
        <div className="rounded-[8px] border-l-4 border-orange-600 bg-orange-50 px-[12px] py-[8px]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-800">Prazo para declarar parceiro</p>
          <p className="text-[16px] font-semibold text-gray-900">{deadline}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4">
        <div className={`${card} border-gray-200`}>
          <p className="text-[22px] font-bold tabular-nums">{counts.pairsConfirmed} <span className="text-[14px] font-normal text-gray-600">de {counts.pairsTotal}</span></p>
          <p className="text-[12px] text-gray-700">parelhas confirmadas (escolha mútua)</p>
        </div>
        <div className={`${card} border-dashed border-gray-400`}>
          <p className="text-[22px] font-bold tabular-nums">{counts.unpaired}</p>
          <p className="text-[12px] text-gray-700">jogadores sem parelha — emparelhados por ranking</p>
        </div>
        <div className={`${card} border-gray-200`}>
          <p className="text-[22px] font-bold tabular-nums">{counts.pendingDeclarations}</p>
          <p className="text-[12px] text-gray-700">declarações à espera de resposta</p>
        </div>
        {onSimulate && (
          <button className={`${card} min-h-[40px] border-orange-600 text-left`} onClick={onSimulate}>
            <p className="text-[15px] font-bold text-orange-800">Simular o teu parceiro →</p>
            <p className="text-[12px] text-gray-700">Vê em que divisão ficarias com cada jogador</p>
          </button>
        )}
      </div>
      <div className="space-y-[4px]">
        <Legend />
        <p className="text-[12px] text-gray-600">Ordem: soma dos pontos de ranking da parelha; empate decidido pelo jogador melhor classificado.</p>
      </div>
      <DivisionCards divisions={divisions} />
      <section>
        <h4 className="mb-[8px] !text-[16px] font-semibold">Como se formam as divisões</h4>
        <ol className="grid gap-[8px] text-[14px] text-gray-800 md:grid-cols-3">
          {[
            'Cada jogador declara um parceiro até ao prazo. A parelha só conta se a escolha for mútua.',
            'Quem fica sem parelha é ordenado pelo ranking e emparelhado em sequência (1.º com 2.º, 3.º com 4.º…), saltando quem já jogou 3 mini-torneios com esse parceiro.',
            'As parelhas são ordenadas pela soma dos pontos e cortadas em grupos de 4. Não há subidas nem descidas: tudo é refeito a cada mini-torneio.',
          ].map((t, i) => (
            <li key={i} className="flex gap-[10px] rounded-[8px] border border-gray-200 bg-white p-[10px]">
              <span className="text-[18px] font-bold" style={{ color: TEAL }}>{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

const STATUS_TEXT: Record<SimulationCandidate['status'], string> = {
  free: 'Sem parelha',
  confirmed: 'Confirmado',
  declaredYou: 'Declarou-te · falta confirmares',
  youDeclared: 'Declaraste-o · falta confirmar',
}

function deltaText(delta: number | null) {
  if (delta == null) return null
  if (delta === 0) return 'igual'
  return delta > 0 ? `sobe ${delta}` : `desce ${-delta}`
}

const byName = (a: RankedPlayer, b: RankedPlayer) => a.name.localeCompare(b.name, 'pt')

export function PartnerSimulator({ competitionId }: { competitionId: number }) {
  const { user } = useAuth()
  const projection = useQuery({ queryKey: projectionKey(competitionId), queryFn: () => teamsV2Api.projection(competitionId) })
  // The roster with points, from the projection (every roster player is in exactly one pair).
  const roster = useMemo(
    () => (projection.data?.divisions ?? []).flatMap(d => d.pairs.flatMap(p => p.players as RankedPlayer[])).sort(byName),
    [projection.data],
  )
  const confirmedWith = useMemo(() => {
    const m = new Map<number, RankedPlayer>()
    for (const d of projection.data?.divisions ?? [])
      for (const p of d.pairs) if (!p.provisional && p.players.length === 2) {
        m.set(p.players[0].id, p.players[1])
        m.set(p.players[1].id, p.players[0])
      }
    return m
  }, [projection.data])

  const meInRoster = user?.playerId && roster.some(p => p.id === user.playerId) ? user.playerId : null
  const [chosenPlayer, setPlayer] = useState<number | null>(null)
  const playerId = chosenPlayer ?? meInRoster
  const [partnerId, setPartner] = useState<number | null>(null)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const resultRef = useRef<HTMLDivElement>(null)

  const sim = useQuery({
    queryKey: [...projectionKey(competitionId), 'simulate', playerId, partnerId],
    queryFn: () => teamsV2Api.simulate(competitionId, playerId, partnerId),
    enabled: playerId !== null,
    placeholderData: keepPreviousData,
  })

  const field = 'mt-[4px] block min-h-[44px] w-full rounded border-2 border-[#006A71] bg-white px-[10px] text-[16px] text-gray-900'
  const label = 'block text-[12px] font-bold uppercase tracking-wide text-[#006A71]'
  const s = sim.data
  const r = s?.result
  const candidates = (s?.candidates ?? []).filter(c => !onlyAvailable || c.status !== 'confirmed')

  return (
    <div className="space-y-[16px]">
      <div>
        <h3 className="!text-[19px] font-semibold">Onde ficarias com outro parceiro?</h3>
        <p className="mt-[6px] text-[14px] text-gray-700">
          Escolhe um parceiro e vê a divisão em que a vossa parelha entraria, tendo em conta as parelhas já confirmadas e o
          emparelhamento por ranking de quem ainda não tem parelha. É só uma simulação: a parelha só existe se ambos se declararem.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[16px] md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-[12px]">
          <label className={label}>
            Eu sou
            <select className={field} value={playerId ?? ''} onChange={e => { setPlayer(Number(e.target.value) || null); setPartner(null) }}>
              {playerId === null && <option value="">Escolhe um jogador…</option>}
              {roster.map(p => <option key={p.id} value={p.id}>{p.name} · {pts(p.rankingPoints)} pts</option>)}
            </select>
          </label>
          <label className={label}>
            Parceiro a simular
            <select className={field} value={partnerId ?? ''} disabled={playerId === null} onChange={e => setPartner(Number(e.target.value) || null)}>
              <option value="">Sem declaração — emparelhar por ranking</option>
              {roster.filter(p => p.id !== playerId).map(p => {
                const w = confirmedWith.get(p.id)
                return <option key={p.id} value={p.id}>{p.name} · {pts(p.rankingPoints)} pts{w && w.id !== playerId ? ` (confirmado com ${w.name})` : ''}</option>
              })}
            </select>
          </label>

          {sim.isError && <p role="alert" className="text-[14px] text-red-700">{errorMessage(sim.error, 'Não foi possível simular.')}</p>}
          {s && r && (
            <div ref={resultRef} className={`scroll-mt-[12px] rounded-[8px] border-2 border-orange-600 bg-orange-50 p-[14px] ${sim.isFetching ? 'opacity-60' : ''}`} aria-live="polite">
              <p className="text-[11px] font-bold uppercase tracking-wide text-orange-800">
                {s.partner ? `Com ${s.partner.name}` : 'Sem declaração · emparelhado por ranking'}
              </p>
              <p className="text-[34px] font-bold leading-[40px] text-orange-900">Divisão {r.tier}</p>
              <p className="text-[15px] font-semibold text-orange-900">{r.seed}.ª parelha de 4</p>
              <p className="mt-[8px] text-[15px] text-gray-900">
                {r.sumBreakdown.map((b, i) => (
                  <span key={b.player?.id ?? i}>{i > 0 && ' + '}<strong>{b.player?.name}</strong> {pts(b.points)}</span>
                ))}
                {' = '}<strong>{pts(r.sum)} pts</strong>
              </p>
              <p className="mt-[4px] text-[13px] text-gray-800">
                Em jogo nesta divisão: até {pts(r.maxPlacePoints)} pts de lugar + {formatPoints(r.maxBonusPoints, 2)} pts de bónus (9 sets) por jogador.
              </p>
              <div className="mt-[10px] space-y-[4px] border-t border-orange-200 pt-[10px] text-[13px] text-gray-800">
                {r.gapUp != null && (
                  <p>A parelha mais fraca da Divisão {r.tier - 1} soma {pts(r.sum + r.gapUp)} pts: faltam {pts(r.gapUp)} pts para subir.</p>
                )}
                {r.marginDown != null && <p>Margem de {pts(r.marginDown)} pts sobre a melhor parelha da Divisão {r.tier + 1}.</p>}
                <p>
                  Sem declarar ninguém: Divisão {s.baseline.tier}
                  {s.baseline.partner ? `, com ${s.baseline.partner.name}` : ''} ({pts(s.baseline.sum)} pts).
                </p>
              </div>
              {r.playedTogether.length > 0 && (
                <p className="mt-[10px] rounded bg-white p-[8px] text-[13px] text-gray-800">
                  Já jogaram juntos no{r.playedTogether.length > 1 ? 's' : ''} Mini-torneio{r.playedTogether.length > 1 ? 's' : ''} {r.playedTogether.join(', ')}.
                  Podem repetir, mas ninguém pode fazer os 4 mini-torneios com o mesmo parceiro.
                </p>
              )}
              {s.locked && (
                <p className="mt-[10px] text-[13px] font-semibold text-gray-800">
                  {s.player.name} já tem parelha ou as parelhas estão fechadas: a simulação mostra as divisões atuais.
                </p>
              )}
            </div>
          )}
        </div>

        {s && (
          <section className="min-w-0">
            <div className="mb-[8px] flex flex-wrap items-center justify-between gap-[8px]">
              <h4 className="!text-[16px] font-semibold" style={{ color: TEAL }}>Divisão projetada com cada parceiro</h4>
              <label className="flex min-h-[40px] items-center gap-[8px] text-[14px]">
                <input type="checkbox" className="h-[20px] w-[20px]" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} />
                Só jogadores disponíveis
              </label>
            </div>
            <ul className="divide-y divide-gray-100 rounded-[8px] border border-gray-200 bg-white">
              {candidates.map(c => {
                const status = c.status === 'confirmed' && c.pairedWith ? `Confirmado com ${c.pairedWith.name}` : STATUS_TEXT[c.status]
                const delta = deltaText(c.delta)
                const active = partnerId === c.player.id
                return (
                  <li key={c.player.id} className={`flex items-center gap-[10px] px-[10px] py-[8px] ${active ? 'bg-orange-50' : !c.allowed ? 'bg-gray-50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center text-[14px] font-semibold"><span className="truncate">{c.player.name}</span><PointsChip value={c.player.rankingPoints} /></p>
                      <p className={`text-[12px] ${c.status === 'declaredYou' ? 'font-semibold text-orange-800' : 'text-gray-600'}`}>
                        {status}
                        {c.playedTogether.length > 0 && <span className="block text-gray-600">Jogaram juntos no MT{c.playedTogether.join(', MT')}</span>}
                        {!c.allowed && <span className="block text-red-700">{c.reason || 'Não podem jogar juntos neste mini-torneio.'}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold tabular-nums">{pts(c.sum)}</p>
                      {c.tier != null && (
                        <p className="whitespace-nowrap text-[12px]">
                          <span className="rounded bg-[#E6F2F3] px-[5px] py-[1px] font-semibold text-[#006A71]">Div {c.tier}</span>
                          {delta && <span className={`ml-[4px] ${c.delta! > 0 ? 'text-green-800' : c.delta! < 0 ? 'text-red-700' : 'text-gray-600'}`}>{delta}</span>}
                        </p>
                      )}
                    </div>
                    <button
                      className={`min-h-[40px] shrink-0 rounded border-2 px-[10px] text-[13px] font-semibold disabled:opacity-40 ${active ? 'border-orange-600 bg-orange-600 text-white' : 'border-[#006A71] text-[#006A71]'}`}
                      disabled={!c.allowed || s.locked}
                      onClick={() => {
                        setPartner(c.player.id)
                        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      Simular
                    </button>
                  </li>
                )
              })}
              {candidates.length === 0 && <li className="px-[10px] py-[14px] text-[14px] text-gray-600">Nenhum jogador disponível.</li>}
            </ul>
            <p className="mt-[6px] text-[12px] text-gray-600">“Sobe / desce” compara com a divisão em que ficarias se não declarasses ninguém.</p>
          </section>
        )}
      </div>

      {s && (
        <section className="space-y-[8px]">
          <div className="flex flex-wrap items-center justify-between gap-[8px]">
            <h4 className="!text-[16px] font-semibold" style={{ color: TEAL }}>Divisões nesta simulação</h4>
            <Legend mine />
          </div>
          <DivisionCards divisions={s.divisions} />
        </section>
      )}
      {playerId === null && roster.length > 0 && <p className="text-[14px] text-gray-600">Escolhe um jogador para simular.</p>}
    </div>
  )
}
