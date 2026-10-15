// Admin: create a competition. Classic is built from the previous one (promotion/relegation on the
// server, minus withdrawals, plus new players); Shuffle and Teams take a roster (Shuffle order = seed).
// Route (proposed to S0): /admin/competitions/new.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Competition, Format } from '@/api/v2'
import { formatPoints } from '@/components/v2/PointsValue'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import type { PlayerSummary } from '@/api/v2'
import { FORMAT_LABEL } from '@/features/competitions/format'
import { adminApi, type CompetitionCreate } from './api'

const FORMATS: [Format, string][] = (['classica', 'shuffle', 'teams'] as const).map(f => [f, FORMAT_LABEL[f]])

const field = 'mt-[4px] block h-[40px] w-full rounded border border-gray-300 px-[8px] text-[15px]'
const label = 'block text-[13px] font-semibold text-gray-700'

function PlayerList({
  title,
  players,
  ids,
  onChange,
  ordered,
}: {
  title: string
  players: PlayerSummary[]
  ids: number[]
  onChange: (ids: number[]) => void
  ordered?: boolean
}) {
  const [query, setQuery] = useState('')
  const byId = useMemo(() => new Map(players.map(p => [p.id, p])), [players])
  const q = query.trim().toLowerCase()
  const matches = q
    ? players.filter(p => p.id !== null && !ids.includes(p.id) && `${p.name} ${p.fullName ?? ''}`.toLowerCase().includes(q)).slice(0, 8)
    : []
  const move = (i: number, d: number) => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div>
      <p className={label}>{title} ({ids.length})</p>
      <input className={field} placeholder="Procurar jogador" value={query} onChange={e => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <ul className="mt-[4px] rounded border border-gray-200 bg-white">
          {matches.map(p => (
            <li key={p.id}>
              <button
                className="block min-h-[40px] w-full px-[10px] py-[8px] text-left text-[14px] hover:bg-gray-50"
                onClick={() => {
                  onChange([...ids, p.id!])
                  setQuery('')
                }}
              >
                {p.name} <span className="text-gray-500">{p.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {ids.length > 0 && (
        <ol className="mt-[8px] space-y-[4px] text-[14px]">
          {ids.map((id, i) => (
            <li key={id} className="flex items-center gap-[8px] rounded bg-gray-50 pl-[8px]">
              {ordered && <span className="w-[24px] text-right tabular-nums text-gray-500">{i + 1}.</span>}
              <span className="flex-1 truncate">{byId.get(id)?.name ?? `#${id}`}</span>
              {ordered && (
                <>
                  <button aria-label="Subir" disabled={i === 0} className="h-[40px] w-[36px] disabled:opacity-30" onClick={() => move(i, -1)}>↑</button>
                  <button aria-label="Descer" disabled={i === ids.length - 1} className="h-[40px] w-[36px] disabled:opacity-30" onClick={() => move(i, 1)}>↓</button>
                </>
              )}
              <button aria-label="Remover" className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center text-[18px] text-red-700" onClick={() => onChange(ids.filter(x => x !== id))}>×</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function CompetitionWizard() {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const [format, setFormat] = useState<Format>('classica')
  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [startsOn, setStartsOn] = useState('')
  const [fromId, setFromId] = useState<number | null>(null)
  const [withdrawals, setWithdrawals] = useState<number[]>([])
  const [newPlayers, setNewPlayers] = useState<number[]>([])
  const [roster, setRoster] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Competition | null>(null)

  const seasons = useQuery({ queryKey: ['v2', 'seasons'], queryFn: adminApi.seasons, enabled: isAdmin })
  const previous = useQuery({
    queryKey: ['v2', 'competitions', { format: 'classica' }],
    queryFn: () => adminApi.competitions('classica'),
    enabled: isAdmin && format === 'classica',
  })
  const players = useQuery({
    queryKey: ['v2', 'players'],
    queryFn: resultsApi.players,
    enabled: isAdmin,
  })

  useEffect(() => {
    if (seasonId === null && seasons.data) setSeasonId(seasons.data.find(s => s.isCurrent)?.id ?? seasons.data[0]?.id ?? null)
  }, [seasons.data, seasonId])
  useEffect(() => {
    if (fromId === null && previous.data?.length) setFromId(previous.data[0].id)
  }, [previous.data, fromId])

  const preview = useMutation({
    mutationFn: (body: CompetitionCreate) => adminApi.preview(body),
    onError: err => setError(errorMessage(err, 'Não foi possível pré-visualizar.')),
  })
  // Any change to the inputs invalidates a shown preview.
  const resetPreview = preview.reset
  useEffect(() => resetPreview(), [format, fromId, withdrawals, newPlayers, roster, resetPreview])

  const create = useMutation({
    mutationFn: (body: CompetitionCreate) => adminApi.create(body),
    onSuccess: c => setCreated(c),
    onError: err => setError(errorMessage(err, 'Não foi possível criar a competição.')),
  })

  if (!isAdmin) return <p className="py-[24px] text-[15px]">Apenas administradores podem criar competições.</p>

  if (created) {
    return (
      <div className="py-[24px]">
        <p className="text-[17px]">
          <strong>{created.name}</strong> criada.
        </p>
        <Link className="mt-[8px] inline-block text-[15px] underline" to={`/competitions/${created.id}`}>Abrir a competição</Link>
      </div>
    )
  }

  // Validated request body, or null after showing the problem.
  const buildBody = (): CompetitionCreate | null => {
    setError(null)
    const fail = (m: string) => (setError(m), null)
    if (!name.trim()) return fail('Indica o nome.')
    if (!seasonId) return fail('Escolhe a época.')
    if (!startsOn) return fail('Indica a data de início.')
    const body: CompetitionCreate = { format, name: name.trim(), seasonId, startsOn }
    if (format === 'classica') {
      if (!fromId) return fail('Escolhe a edição anterior.')
      return { ...body, fromCompetitionId: fromId, withdrawals, newPlayerIds: newPlayers }
    }
    if (roster.length < 4) return fail('Escolhe pelo menos 4 jogadores.')
    if (format === 'teams' && roster.length % 2) return fail('A Teams precisa de um número par de jogadores.')
    return { ...body, playerIds: roster }
  }

  const submit = () => {
    const body = buildBody()
    if (body) create.mutate(body)
  }

  const showPreview = () => {
    const body = buildBody()
    if (body) preview.mutate(body)
  }

  const allPlayers = players.data ?? []
  return (
    <div className="max-w-[560px] space-y-[18px] py-[24px]">
      <h1 className="!text-[24px] font-bold">Nova competição</h1>

      <div className="flex gap-[6px]" role="radiogroup" aria-label="Formato">
        {FORMATS.map(([f, l]) => (
          <button
            key={f}
            role="radio"
            aria-checked={format === f}
            className={`min-h-[40px] rounded-full px-[14px] py-[8px] text-[14px] ${format === f ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
            onClick={() => setFormat(f)}
          >
            {l}
          </button>
        ))}
      </div>

      <label className={label}>
        Nome
        <input className={field} value={name} onChange={e => setName(e.target.value)} placeholder={format === 'classica' ? '23ª Edição' : ''} />
      </label>
      <div className="grid grid-cols-2 gap-[12px]">
        <label className={label}>
          Época
          <select className={field} value={seasonId ?? ''} onChange={e => setSeasonId(Number(e.target.value))}>
            {(seasons.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className={label}>
          Início
          <input type="date" className={field} value={startsOn} onChange={e => setStartsOn(e.target.value)} />
        </label>
      </div>

      {format === 'classica' ? (
        <>
          <label className={label}>
            A partir de (subidas e descidas)
            <select className={field} value={fromId ?? ''} onChange={e => setFromId(Number(e.target.value))}>
              {(previous.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name} · {c.season.name}</option>)}
            </select>
          </label>
          <p className="text-[13px] text-gray-600">
            As divisões são calculadas a partir da classificação final da edição anterior. Usa a pré-visualização antes de criar.
          </p>
          <PlayerList title="Desistências" players={allPlayers} ids={withdrawals} onChange={setWithdrawals} />
          <PlayerList title="Novos jogadores" players={allPlayers} ids={newPlayers} onChange={setNewPlayers} ordered />
        </>
      ) : (
        <PlayerList
          title={format === 'shuffle' ? 'Jogadores (a ordem define a seriação)' : 'Inscritos'}
          players={allPlayers}
          ids={roster}
          onChange={setRoster}
          ordered={format === 'shuffle'}
        />
      )}

      {preview.data && (
        <section aria-label="Pré-visualização" className="rounded-lg border border-gray-200 bg-white p-[12px]">
          <h2 className="mb-[8px] !text-[16px] font-semibold">Pré-visualização (nada foi guardado)</h2>
          {(preview.data.notes ?? []).map(n => <p key={n} className="text-[13px] text-amber-800">{n}</p>)}
          <div className="mt-[8px] grid gap-[8px] sm:grid-cols-2">
            {preview.data.groups.map(g => (
              <div key={g.tier} className="rounded bg-gray-50 p-[8px] text-[13px]">
                <p className="font-semibold">{g.name} <span className="font-normal text-gray-500">· {formatPoints(g.rating)} pts</span></p>
                <p className="text-gray-700">{g.players.map(x => x.name).join(', ') || '—'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p role="alert" className="text-[14px] text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-[8px]">
        <button
          className="min-h-[40px] rounded border border-gray-900 px-[18px] py-[10px] text-[15px] font-semibold disabled:opacity-40"
          disabled={preview.isPending}
          onClick={showPreview}
        >
          {preview.isPending ? 'A calcular…' : 'Pré-visualizar divisões'}
        </button>
        <button
          className="min-h-[40px] rounded bg-gray-900 px-[18px] py-[10px] text-[15px] font-semibold text-white disabled:opacity-40"
          disabled={create.isPending}
          onClick={submit}
        >
          {create.isPending ? 'A criar…' : 'Criar competição'}
        </button>
      </div>
    </div>
  )
}
