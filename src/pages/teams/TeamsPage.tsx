import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { teamsApi } from '@/api/teams'
import { playersApi } from '@/api/players'
import { useAuth } from '@/context/AuthContext'
import { PlayerShort, TeamsPlayer, TeamsState } from '@/types'

const deadlineFormat = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Lisbon',
})

const SOURCE_LABEL: Record<string, string> = {
  mutual: 'escolha mútua',
  auto: 'por ranking',
  admin: 'organização',
}

function Avatar({ player }: { player: PlayerShort | TeamsPlayer }) {
  return player.pictureUrl ? (
    <img src={player.pictureUrl} alt="" className="h-[36px] w-[36px] shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-gray-200 text-[13px] font-semibold text-gray-600">
      {player.name.slice(0, 1)}
    </div>
  )
}

function errorMessage(err: any) {
  return err?.response?.data?.error ?? 'Não foi possível guardar. Tenta outra vez.'
}

export default function TeamsPage() {
  const { user } = useAuth()
  const [state, setState] = useState<TeamsState | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [manual, setManual] = useState<[string, string]>(['', ''])
  const [allPlayers, setAllPlayers] = useState<PlayerShort[]>([])
  const [toAdd, setToAdd] = useState('')

  useEffect(() => {
    teamsApi
      .state()
      .then(res => setState(res.data))
      .catch(err => {
        if (err?.response?.status === 404) setNotFound(true)
      })
  }, [user?.id])

  const isAdmin = !!state?.me.isAdmin
  useEffect(() => {
    if (!isAdmin) return
    playersApi.players_short().then(res => setAllPlayers(res.data)).catch(() => {})
  }, [isAdmin])

  const byId = useMemo(
    () => new Map((state?.players ?? []).map(p => [p.id, p])),
    [state],
  )

  async function run(action: () => Promise<{ data: TeamsState }>, success?: (s: TeamsState) => string | null) {
    setBusy(true)
    try {
      const res = await action()
      setState(res.data)
      const message = success?.(res.data)
      if (message) toast.success(message)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (notFound) {
    return (
      <div className="l-grid py-[32px]">
        <h1 className="!text-[24px] font-bold">PPL Teams</h1>
        <p className="text-[15px] mt-[8px] text-gray-600">Ainda não há mini-torneios da Teams.</p>
      </div>
    )
  }
  if (!state) return null

  const { miniTournament: mt, me, pairs } = state
  const myPair = pairs.find(p => p.id === me.pairId)
  const myChoice = me.myChoice ? byId.get(me.myChoice) : undefined
  const choseMe = me.choseMe.map(id => byId.get(id)).filter(Boolean) as TeamsPlayer[]
  const canChoose = me.inRoster && !myPair && mt.pairingOpen
  const unpaired = state.players.filter(p => !p.paired)
  const query = search.trim().toLowerCase()
  const candidates = unpaired.filter(
    p => p.id !== me.playerId && (!query || p.name.toLowerCase().includes(query) || p.fullName.toLowerCase().includes(query)),
  )

  const choose = (p: TeamsPlayer) =>
    run(
      () => teamsApi.choosePartner(p.id),
      s => (s.me.pairId ? `Match feito com ${p.name}!` : `Escolheste ${p.name}. Falta ${p.name} escolher-te.`),
    )

  return (
    <div className="l-grid py-[24px]">
      <header className="mb-[22px]">
        <h1 className="!text-[24px] font-bold">PPL Teams · Mini-torneio {mt.number}</h1>
        {mt.pairingOpen ? (
          <p className="text-[15px] mt-1 text-gray-700">
            Escolhe o teu parceiro até <strong>{deadlineFormat.format(new Date(mt.pairingDeadline))}</strong>. A
            parelha só conta se a escolha for mútua; quem ficar sem parelha é emparelhado pelo ranking.
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
              A tua parelha: <strong>{myPair.players.map(p => p.name).join(' & ')}</strong>
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
                    className="rounded border border-gray-300 px-[12px] py-[6px] text-[13px] hover:bg-gray-50"
                    disabled={busy}
                    onClick={() => run(() => teamsApi.withdraw(), () => 'Escolha cancelada.')}
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
                        className="rounded-full bg-green-600 px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-green-700 disabled:opacity-50"
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
            <h2 className="!text-[19px] font-semibold">Escolher parceiro</h2>
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
              const choseYou = me.choseMe.includes(p.id)
              return (
                <li key={p.id} className="flex items-center gap-[12px] px-[12px] py-[10px]">
                  <Avatar player={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] truncate font-medium">{p.name}</p>
                    <p className="text-[12px] text-gray-500">
                      {p.rankingPosition ? `${p.rankingPosition}.º · ` : ''}
                      {p.rankingPoints} pts
                      {choseYou && <span className="ml-2 font-semibold text-green-700">escolheu-te</span>}
                      {!p.allowedForMe && <span className="ml-2">já jogaram 3 mini-torneios juntos</span>}
                    </p>
                  </div>
                  {chosen ? (
                    <span className="text-[13px] font-semibold text-gray-600">Escolhido</span>
                  ) : (
                    <button
                      className="rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
                      disabled={busy || !p.allowedForMe}
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
        <h2 className="mb-[12px] !text-[19px] font-semibold">
          Parelhas formadas ({pairs.length}/{state.players.length / 2})
        </h2>
        {pairs.length === 0 ? (
          <p className="text-[15px] text-gray-500">Ainda não há parelhas.</p>
        ) : (
          <ul className="grid gap-[8px] sm:grid-cols-2">
            {pairs.map(pair => (
              <li key={pair.id} className="flex items-center gap-[12px] rounded-lg border border-gray-200 bg-white px-[12px] py-[10px]">
                <div className="flex -space-x-2">
                  {pair.players.map(p => <Avatar key={p.id} player={p} />)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] truncate font-medium">{pair.players.map(p => p.name).join(' & ')}</p>
                  <p className="text-[12px] text-gray-500">
                    {pair.rankingPoints} pts · {SOURCE_LABEL[pair.source]}
                  </p>
                </div>
                {me.isAdmin && !mt.pairingClosed && (
                  <button
                    className="text-[12px] text-red-700 underline"
                    disabled={busy}
                    onClick={() => run(() => teamsApi.unpair(pair.id), () => 'Parelha desfeita.')}
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
          <h2 className="mb-2 !text-[19px] font-semibold">Sem parelha ({unpaired.length})</h2>
          <p className="text-[15px] text-gray-700">{unpaired.map(p => p.name).join(', ')}</p>
        </section>
      )}

      {me.isAdmin && !mt.pairingClosed && (
        <section className="mb-[28px] rounded-lg border border-amber-300 bg-amber-50 p-[16px]">
          <h2 className="mb-[12px] text-[17px] font-semibold">Organização</h2>

          <div className="mb-4 flex flex-wrap items-center gap-[8px]">
            {[0, 1].map(i => (
              <select
                key={i}
                className="form-select"
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
              className="rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
              disabled={busy || !manual[0] || !manual[1]}
              onClick={() =>
                run(() => teamsApi.setPair([Number(manual[0]), Number(manual[1])]), () => {
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
              <select className="form-select" value={toAdd} onChange={e => setToAdd(e.target.value)}>
                <option value="">Adicionar jogador…</option>
                {allPlayers
                  .filter(p => p.id !== null && !byId.has(p.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
              </select>
              <button
                className="rounded bg-gray-900 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
                disabled={busy || !toAdd}
                onClick={() =>
                  run(() => teamsApi.addToRoster(Number(toAdd)), () => {
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
                <li key={p.id} className="flex items-center gap-[4px] rounded-full bg-white px-[10px] py-[4px] text-[13px]">
                  {p.name}
                  <button
                    className="text-red-700"
                    aria-label={`Retirar ${p.name}`}
                    disabled={busy}
                    onClick={() => run(() => teamsApi.removeFromRoster(p.id), () => `${p.name} retirado.`)}
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
                className="rounded bg-red-700 px-[12px] py-[6px] text-[13px] font-semibold text-white disabled:opacity-40"
                disabled={busy}
                onClick={() => run(() => teamsApi.closePairing(), () => 'Parelhas fechadas.').then(() => setConfirmClose(false))}
              >
                Sim, fechar
              </button>
              <button className="px-[12px] py-[6px] text-[13px] underline" onClick={() => setConfirmClose(false)}>
                Não
              </button>
            </div>
          ) : (
            <button
              className="rounded border border-red-700 px-[12px] py-[6px] text-[13px] font-semibold text-red-700"
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
