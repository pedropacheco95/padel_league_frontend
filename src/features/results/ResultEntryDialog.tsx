import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Match } from '@/api/v2'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errorMessage, resultsApi } from './api'
import { buildResult, buildWalkover, setInProgress, teamsSetPoints, TEAMS_SETS, walkoverAbsentees, type SetDraft, type Side } from './resultInput'
import type { ResultInput } from '@/api/v2'
import { sideNames } from './matchText'

const emptySets = (n: number): SetDraft[] => Array.from({ length: n }, () => ({ home: '', away: '' }))

function draftFrom(match: Match, n: number): SetDraft[] {
  const sets = emptySets(n)
  for (const s of match.sets) {
    if (s.setNo >= 1 && s.setNo <= n) sets[s.setNo - 1] = { home: s.homeGames?.toString() ?? '', away: s.awayGames?.toString() ?? '' }
  }
  return sets
}

function timeoutFrom(match: Match): number | null {
  const i = match.sets.findIndex(s => s.outcome !== 'completed')
  return i >= 0 ? match.sets[i].setNo - 1 : null
}

export const groupMatchesKey = (groupId: number) => ['v2', 'groups', groupId, 'matches'] as const

export default function ResultEntryDialog({
  match,
  roundId,
  open,
  onOpenChange,
}: {
  match: Match
  roundId?: number
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const teams = match.format === 'teams'
  const n = teams ? TEAMS_SETS : 1
  const [sets, setSets] = useState<SetDraft[]>(() => draftFrom(match, n))
  const [timeoutAt, setTimeoutAt] = useState<number | null>(() => (teams ? timeoutFrom(match) : null))
  const [walkover, setWalkover] = useState<Side | null>(null)
  const [woAbsent, setWoAbsent] = useState<number | 'both' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!open) return
    setSets(draftFrom(match, n))
    setTimeoutAt(teams ? timeoutFrom(match) : null)
    setWalkover(match.status === 'walkover' && match.winner !== 'draw' ? (match.winner ?? null) : null)
    setWoAbsent(null)
    setError(null)
  }, [open, match, n, teams])

  const save = useMutation({
    // A walkover first records the no-shows as absent for the round (they lose the presence; whoever
    // of the losing pair came keeps it), then the result.
    mutationFn: async ({ input, absentees }: { input: ResultInput; absentees: number[] }) => {
      for (const playerId of absentees) await resultsApi.addAbsence(roundId!, { playerId, groupId: match.groupId })
      return resultsApi.putResult(match.id, input)
    },
    // Optimistic: the card shows the new result at once; the server copy replaces it on success.
    onMutate: async ({ input }) => {
      const key = groupMatchesKey(match.groupId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueriesData<Match[]>({ queryKey: key })
      const optimistic: Match = {
        ...match,
        status: input.walkoverWinner ? 'walkover' : 'played',
        sets: input.sets.map((s, i) => ({ setNo: i + 1, ...s })),
        winner: input.walkoverWinner ?? match.winner,
      }
      qc.setQueriesData<Match[]>({ queryKey: key }, old => old?.map(m => (m.id === match.id ? optimistic : m)))
      return { previous }
    },
    onSuccess: saved => {
      qc.setQueriesData<Match[]>({ queryKey: groupMatchesKey(match.groupId) }, old => old?.map(m => (m.id === saved.id ? saved : m)))
      qc.invalidateQueries({ queryKey: ['v2', 'groups', match.groupId] })
      qc.invalidateQueries({ queryKey: ['v2', 'group', match.groupId] }) // S3's group page cache
      qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'v2' && q.queryKey[1] === 'competitions' && q.queryKey[3] === 'standings' })
      toast.success('Resultado guardado.')
      onOpenChange(false)
    },
    onError: (err, _input, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
      setError(errorMessage(err))
    },
  })

  const built = walkover ? ({ ok: true, input: buildWalkover(walkover) } as const) : buildResult(match.format, sets, timeoutAt)
  const preview = teams && built.ok && !walkover ? teamsSetPoints(built.input) : null
  const [home, away] = sideNames(match)

  const setGame = (i: number, side: 'home' | 'away', v: string) => {
    if (v !== '' && !/^\d{1,2}$/.test(v)) return
    setSets(prev => prev.map((s, k) => (k === i ? { ...s, [side]: v } : s)))
    setError(null)
  }

  const alreadyAbsent = (match.absences ?? []).map(a => a.player.id)
  const losers = walkover
    ? match.participants.filter(p => p.side !== walkover && p.role === 'member' && p.player && !alreadyAbsent.includes(p.player.id))
    : []

  const submit = () => {
    if ('error' in built) return setError(built.error)
    let absentees: number[] = []
    if (walkover && losers.length > 0) {
      if (woAbsent === null) return setError('Indica quem faltou da dupla que perdeu por falta de comparência.')
      if (!roundId) return setError('Jornada sem identificador; não é possível registar a falta.')
      absentees = walkoverAbsentees(match.participants, walkover, woAbsent, alreadyAbsent)
    }
    save.mutate({ input: built.input, absentees })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] border-gray-200 bg-white p-[20px] text-gray-900">
        <DialogHeader>
          <DialogTitle className="!text-[18px] !text-gray-900">Resultado</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_56px_56px] items-center gap-x-[8px] gap-y-[10px] text-[14px]">
          <span />
          <span className="truncate text-center text-[12px] font-semibold text-gray-600" title={home}>Casa</span>
          <span className="truncate text-center text-[12px] font-semibold text-gray-600" title={away}>Fora</span>
          <span className="col-span-3 -mt-[6px] text-[12px] text-gray-500">{home} <span className="text-gray-600">vs</span> {away}</span>

          {!walkover && sets.map((s, i) => {
            const notStarted = timeoutAt !== null && i > timeoutAt
            const isTimeout = timeoutAt === i
            return (
              <div key={i} className="contents">
                <span className="text-[14px]">
                  {teams ? `Set ${i + 1}` : 'Jogos'}
                  {isTimeout && <span className="ml-[6px] text-[12px] text-amber-700">tempo esgotado</span>}
                  {notStarted && <span className="ml-[6px] text-[12px] text-gray-500">não jogado</span>}
                </span>
                {(['home', 'away'] as const).map(side => (
                  <input
                    key={side}
                    aria-label={`${teams ? `Set ${i + 1}` : 'Jogos'} ${side === 'home' ? 'casa' : 'fora'}`}
                    inputMode="numeric"
                    className="h-[40px] w-full rounded border border-gray-300 text-center text-[16px] disabled:bg-gray-100"
                    value={notStarted ? '' : s[side]}
                    disabled={notStarted}
                    onChange={e => setGame(i, side, e.target.value)}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {teams && !walkover && (
          <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
            {timeoutAt === null ? (
              <button
                className="min-h-[40px] rounded border border-amber-600 px-[10px] py-[6px] text-[13px] text-amber-800"
                onClick={() => setTimeoutAt(setInProgress(sets))}
              >
                Tempo esgotado
              </button>
            ) : (
              <>
                <label className="text-[13px] text-gray-700">
                  Tempo esgotado no
                  <select className="ml-[6px] min-h-[40px] rounded border border-gray-300 px-[6px] py-[2px]" value={timeoutAt} onChange={e => setTimeoutAt(Number(e.target.value))}>
                    {Array.from({ length: TEAMS_SETS }, (_, i) => <option key={i} value={i}>set {i + 1}</option>)}
                  </select>
                </label>
                <button className="min-h-[40px] px-[8px] text-[13px] underline" onClick={() => setTimeoutAt(null)}>Anular</button>
              </>
            )}
          </div>
        )}

        {/* Only Teams records walkovers (the server rejects them elsewhere). */}
        {teams && <details className="mt-[12px] text-[13px]" open={!!walkover}>
          <summary className="cursor-pointer text-gray-600">Falta de comparência (W.O.)</summary>
          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            {(['home', 'away'] as const).map(side => (
              <button
                key={side}
                className={`min-h-[40px] rounded border px-[10px] py-[6px] ${walkover === side ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300'}`}
                onClick={() => {
                  setWalkover(w => (w === side ? null : side))
                  setWoAbsent(null)
                }}
              >
                Vitória {side === 'home' ? 'casa' : 'fora'}
              </button>
            ))}
          </div>
          {walkover && losers.length > 0 && (
            <div className="mt-[10px]">
              <p className="text-gray-700">Quem faltou? Quem veio mantém a presença.</p>
              <div className="mt-[6px] flex flex-wrap gap-[8px]" role="radiogroup" aria-label="Quem faltou">
                {[...losers.map(p => [p.player!.id, p.player!.name] as const), ['both', 'Faltaram os dois'] as const].map(([value, name]) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={woAbsent === value}
                    className={`min-h-[40px] rounded-full border px-[12px] py-[6px] ${woAbsent === value ? 'border-red-700 bg-red-700 text-white' : 'border-gray-300'}`}
                    onClick={() => setWoAbsent(value)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </details>}

        {preview && (
          <p className="mt-[12px] text-[13px] text-gray-700">
            Pontos: <strong>{preview[0]}</strong> – <strong>{preview[1]}</strong>
          </p>
        )}
        {error && <p role="alert" className="mt-[10px] text-[13px] text-red-700">{error}</p>}

        <div className="mt-[16px] flex justify-end gap-[8px]">
          <button className="min-h-[40px] px-[12px] py-[8px] text-[14px] underline" onClick={() => onOpenChange(false)}>Cancelar</button>
          <button
            className="min-h-[40px] rounded bg-gray-900 px-[16px] py-[8px] text-[14px] font-semibold text-white disabled:opacity-40"
            disabled={save.isPending}
            onClick={submit}
          >
            {save.isPending ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
