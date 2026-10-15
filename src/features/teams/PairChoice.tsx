// Port of src/pages/teams/TeamsPage.tsx (feature/teams-pairs) into the Teams competition page.
// Same behaviour and copy; data via React Query keyed by competition, every write returns the new state.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosResponse } from 'axios'
import { toast } from 'sonner'
import type { PlayerRef, TeamsState } from '@/api/v2'
import type { PlayerSummary } from '@/api/v2'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import { formatPoints } from '@/components/v2/PointsValue'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import { teamsApi } from './api'

type TeamsPlayer = TeamsState['players'][number]

const deadlineFormat = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Lisbon',
})

function formatDeadline(iso?: string) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? deadlineFormat.format(d) : null
}

const SOURCE_LABEL: Record<string, string> = {
  mutual: 'escolha mútua',
  auto: 'por ranking',
  admin: 'organização',
}

// S3's PlayerAvatar: photo → site default → initials when an image fails to load.
export function Avatar({ player, size = 36 }: { player: PlayerRef; size?: number }) {
  return <PlayerAvatar player={player} size={size} link={false} />
}

const httpStatus = (err: unknown) => (err as { response?: { status?: number } } | null)?.response?.status

export const teamsStateKey = (competitionId: number) => ['v2', 'teams', competitionId] as const

export default function PairChoice({ competitionId }: { competitionId: number }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [manual, setManual] = useState<[string, string]>(['', ''])
  const [toAdd, setToAdd] = useState('')

  const stateQuery = useQuery({
    queryKey: [...teamsStateKey(competitionId), user?.id ?? null],
    queryFn: async () => (await teamsApi.state(competitionId)).data,
    retry: (count, err) => httpStatus(err) !== 404 && count < 2,
  })
  const state = stateQuery.data

  const isAdmin = !!state?.me.isAdmin
  const allPlayersQuery = useQuery({
    queryKey: ['v2', 'players'],
    queryFn: resultsApi.players,
    enabled: isAdmin,
  })

  const mutation = useMutation({
    mutationFn: ({ action }: { action: () => Promise<AxiosResponse<TeamsState>>; success?: (s: TeamsState) => string | null }) =>
      action().then(r => r.data),
    onSuccess: (next, { success }) => {
      qc.setQueryData([...teamsStateKey(competitionId), user?.id ?? null], next)
      // Closing pairs changes the stage (pairingClosed) that the divisions tab reads.
      qc.invalidateQueries({ queryKey: ['v2', 'competitions', competitionId], exact: true })
      const message = success?.(next)
      if (message) toast.success(message)
    },
    onError: err => toast.error(errorMessage(err)),
  })
  const busy = mutation.isPending
  const run = (action: () => Promise<AxiosResponse<TeamsState>>, success?: (s: TeamsState) => string | null) =>
    mutation.mutateAsync({ action, success }).catch(() => undefined)

  const byId = useMemo(() => new Map((state?.players ?? []).map(p => [p.id, p])), [state])

  if (httpStatus(stateQuery.error) === 404) {
    return <p className="text-[15px] text-gray-600">Ainda não há mini-torneios da Teams.</p>
  }
  if (stateQuery.isError) {
    return (
      <p className="text-[15px] text-red-700">
        Não foi possível carregar as parelhas.{' '}
        <button className="min-h-[40px] px-[8px] underline" onClick={() => stateQuery.refetch()}>Tentar outra vez</button>
      </p>
    )
  }
  if (!state) return null

  const { miniTournament: mt, me } = state
  const pairs = state.pairs ?? []
  const choseMeIds = me.choseMe ?? []
  const myPair = me.pairId ? pairs.find(p => p.id === me.pairId) : undefined
  const myChoice = me.myChoice ? byId.get(me.myChoice) : undefined
  const choseMe = choseMeIds.map(id => byId.get(id)).filter(Boolean) as TeamsPlayer[]
  const canChoose = !!me.inRoster && !myPair && !!mt.pairingOpen
  const unpaired = state.players.filter(p => !p.paired)
  const query = search.trim().toLowerCase()
  const candidates = unpaired.filter(
    p =>
      p.id !== me.playerId &&
      (!query || p.name.toLowerCase().includes(query) || (p.fullName ?? '').toLowerCase().includes(query)),
  )
  const deadline = formatDeadline(mt.pairingDeadline)
  const pairNames = (players?: PlayerRef[]) => (players ?? []).map(p => p.name).join(' & ')

  const choose = (p: TeamsPlayer) =>
    run(
      () => teamsApi.choosePartner(competitionId, p.id),
      s => (s.me.pairId ? `Match feito com ${p.name}!` : `Escolheste ${p.name}. Falta ${p.name} escolher-te.`),
    )

  return (
    <div>
      <header className="mb-[22px]">
        <h2 className="!text-[20px] font-bold">Mini-torneio {mt.number}</h2>
        {mt.pairingOpen ? (
          <p className="text-[15px] mt-1 text-gray-700">
            Escolhe o teu parceiro{deadline ? <> até <strong>{deadline}</strong></> : null}. A parelha só conta se a
            escolha for mútua; quem ficar sem parelha é emparelhado pelo ranking.
          </p>
        ) : (
          <p className="text-[15px] mt-1 text-gray-700">
            {mt.pairingClosed ? 'As parelhas estão fechadas.' : 'O prazo terminou; as parelhas vão ser fechadas pela organização.'}
          </p>
        )}
      </header>

      {/* The viewer's own situation */}
      <section className="mb-[28px] rounded-lg border border-gray-200 bg-white p-[16px] shadow-sm">
        {!user ? (
          <p className="text-[15px]">
            <Link to="/login" className="font-semibold underline">Faz login</Link> para escolher o teu parceiro.
            Se não sabes a password, usa <Link to="/forgot-password" className="underline">recuperar password</Link>.
          </p>
        ) : !me.inRoster ? (
          <p className="text-[15px]">Não estás inscrito na Teams deste mini-torneio.</p>
        ) : myPair ? (
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-green-700">Match feito ✓</p>
            <p className="mt-1 text-[17px]">
              A tua parelha: <strong>{pairNames(myPair.players)}</strong>
            </p>
          </div>
        ) : (
          <div className="space-y-[12px]">
            {myChoice?.paired ? (
              <p className="text-[15px]">
                <strong>{myChoice.name}</strong> já formou parelha com outra pessoa. Escolhe outro parceiro.
              </p>
            ) : myChoice ? (
              <div className="flex flex-wrap items-center justify-between gap-[12px]">
                <p className="text-[15px]">
                  Escolheste <strong>{myChoice.name}</strong>. À espera que {myChoice.name} te escolha.
                </p>
                {mt.pairingOpen && (
                  <button
                    className="min-h-[40px] rounded border border-gray-300 px-[12px] py-[6px] text-[13px] hover:bg-gray-50"
                    disabled={busy}
                    onClick={() => run(() => teamsApi.withdraw(competitionId), () => 'Escolha cancelada.')}
                  >
                    Cancelar escolha
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[15px]">Ainda não escolheste parceiro.</p>
            )}
            {choseMe.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold">Escolheram-te:</p>
                <ul className="mt-[8px] flex flex-wrap gap-[8px]">
                  {choseMe.map(p => (
                    <li key={p.id}>
                      <button
                        className="min-h-[40px] rounded-full bg-green-600 px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        disabled={busy || !canChoose}
                        onClick={() => choose(p)}
                      >
                        Aceitar {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {canChoose && (
        <section className="mb-[28px]">
          <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[12px]">
            <h3 className="!text-[19px] font-semibold">Escolher parceiro</h3>
            <input
              className="form-control w-full sm:w-[260px]"
              placeholder="Procurar jogador"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {candidates.map(p => {
              const chosen = me.myChoice === p.id
              const choseYou = choseMeIds.includes(p.id)
              return (
                <li key={p.id} className="flex items-center gap-[12px] px-[12px] py-[10px]">
                  <Avatar player={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] truncate font-medium">{p.name}</p>
                    <p className="text-[12px] text-gray-500">
                      {p.rankingPosition ? `${p.rankingPosition}.º · ` : ''}
                      {formatPoints(p.rankingPoints ?? 0)} pts
                      {choseYou && <span className="ml-2 font-semibold text-green-700">escolheu-te</span>}
                      {p.allowedForMe === false && <span className="ml-2">já jogaram 3 mini-torneios juntos</span>}
                    </p>
                  </div>
                  {chosen ? (
                    <span className="text-[13px] font-semibold text-gray-600">Escolhido</span>
                  ) : (
                    <button
                      className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
                      disabled={busy || p.allowedForMe === false}
                      onClick={() => choose(p)}
                    >
                      {choseYou ? 'Aceitar' : 'Escolher'}
                    </button>
                  )}
                </li>
              )
            })}
            {candidates.length === 0 && <li className="px-[12px] py-[16px] text-gray-500">Nenhum jogador disponível.</li>}
          </ul>
        </section>
      )}

      <section className="mb-[28px]">
        <h3 className="mb-[12px] !text-[19px] font-semibold">
          Parelhas formadas ({pairs.length}/{Math.floor(state.players.length / 2)})
        </h3>
        {pairs.length === 0 ? (
          <p className="text-[15px] text-gray-500">Ainda não há parelhas.</p>
        ) : (
          <ul className="grid gap-[8px] sm:grid-cols-2">
            {pairs.map(pair => (
              <li key={pair.id} className="flex items-center gap-[12px] rounded-lg border border-gray-200 bg-white px-[12px] py-[10px]">
                <div className="flex -space-x-2">
                  {(pair.players ?? []).map(p => <Avatar key={p.id} player={p} />)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] truncate font-medium">{pairNames(pair.players)}</p>
                  <p className="text-[12px] text-gray-500">
                    {formatPoints(pair.rankingPoints ?? 0)} pts{pair.source ? ` · ${SOURCE_LABEL[pair.source] ?? pair.source}` : ''}
                  </p>
                </div>
                {me.isAdmin && !mt.pairingClosed && pair.id != null && (
                  <button
                    className="min-h-[40px] shrink-0 px-[8px] text-[13px] text-red-700 underline"
                    disabled={busy}
                    onClick={() => run(() => teamsApi.unpair(competitionId, pair.id!), () => 'Parelha desfeita.')}
                  >
                    Desfazer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {unpaired.length > 0 && (
        <section className="mb-[28px]">
          <h3 className="mb-2 !text-[19px] font-semibold">Sem parelha ({unpaired.length})</h3>
          <p className="text-[15px] text-gray-700">{unpaired.map(p => p.name).join(', ')}</p>
        </section>
      )}

      {me.isAdmin && !mt.pairingClosed && (
        <section className="mb-[28px] rounded-lg border border-amber-300 bg-amber-50 p-[16px]">
          <h3 className="mb-[12px] text-[17px] font-semibold">Organização</h3>

          <div className="mb-4 flex flex-wrap items-center gap-[8px]">
            {[0, 1].map(i => (
              <select
                key={i}
                className="form-select min-h-[40px] text-[15px]"
                value={manual[i]}
                onChange={e => setManual(m => (i === 0 ? [e.target.value, m[1]] : [m[0], e.target.value]))}
              >
                <option value="">Jogador {i + 1}</option>
                {unpaired.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ))}
            <button
              className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
              disabled={busy || !manual[0] || !manual[1] || manual[0] === manual[1]}
              onClick={() =>
                run(() => teamsApi.setPair(competitionId, [Number(manual[0]), Number(manual[1])]), () => {
                  setManual(['', ''])
                  return 'Parelha formada.'
                })
              }
            >
              Formar parelha
            </button>
          </div>

          <div className="mb-[16px]">
            <p className="text-[13px] font-semibold">Inscritos na Teams ({state.players.length})</p>
            <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
              <select className="form-select min-h-[40px] text-[15px]" value={toAdd} onChange={e => setToAdd(e.target.value)}>
                <option value="">Adicionar jogador…</option>
                {(allPlayersQuery.data ?? [])
                  .filter(p => p.id !== null && !byId.has(p.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
              </select>
              <button
                className="min-h-[40px] rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
                disabled={busy || !toAdd}
                onClick={() =>
                  run(() => teamsApi.addToRoster(competitionId, Number(toAdd)), () => {
                    setToAdd('')
                    return 'Jogador adicionado.'
                  })
                }
              >
                Adicionar
              </button>
            </div>
            <ul className="mt-[8px] flex flex-wrap gap-[6px]">
              {unpaired.map(p => (
                <li key={p.id} className="flex items-center rounded-full bg-white pl-[12px] text-[13px]">
                  {p.name}
                  <button
                    className="inline-flex h-[40px] w-[40px] items-center justify-center text-[18px] text-red-700"
                    aria-label={`Retirar ${p.name}`}
                    disabled={busy}
                    onClick={() => run(() => teamsApi.removeFromRoster(competitionId, p.id), () => `${p.name} retirado.`)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {confirmClose ? (
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className="text-[15px]">Emparelhar os restantes {unpaired.length} pelo ranking e fechar as parelhas?</span>
              <button
                className="min-h-[40px] rounded bg-red-700 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
                disabled={busy}
                onClick={() => run(() => teamsApi.closePairing(competitionId), () => 'Parelhas fechadas.').then(() => setConfirmClose(false))}
              >
                Sim, fechar
              </button>
              <button className="min-h-[40px] px-[12px] py-[6px] text-[13px] underline" onClick={() => setConfirmClose(false)}>
                Não
              </button>
            </div>
          ) : (
            <button
              className="min-h-[40px] rounded border border-red-700 px-[12px] py-[6px] text-[13px] font-semibold text-red-700"
              onClick={() => setConfirmClose(true)}
            >
              Fechar parelhas
            </button>
          )}
        </section>
      )}
    </div>
  )
}
