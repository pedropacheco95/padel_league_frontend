// /editar-jogos: the header's "Editar jogos" link. Finds the signed-in player's division in the live
// competition(s) and redirects to its Jogos view on the current jornada (see myGames.ts). It reads
// the same queries the landing pages use (['v2','competition',id], ['v2','groups',id]), so the
// landing page paints from cache.
import { useQueries } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { competitionsApi, useCompetitions } from '@/features/competitions/api'
import { resultsApi } from './api'
import { currentStage, landingPath, pickTarget, type MyGamesTarget } from './myGames'

const STALE = 60_000

export default function EditGamesPage() {
  const { user, loading: authLoading } = useAuth()
  const playerId = user?.playerId ?? null
  const enabled = !!playerId
  const cards = useCompetitions()
  const live = (cards.data ?? []).filter(c => c.status === 'live')
  const details = useQueries({
    queries: live.map(c => ({ queryKey: ['v2', 'competition', c.id], queryFn: () => competitionsApi.get(c.id), enabled, staleTime: STALE })),
  })
  // Every group of each live competition's current stage; the competition payload lists no members,
  // so the group details tell which one is the player's (useMyGroup does the same on the panels).
  const groups = details.flatMap((d, i) => {
    const stage = d.data ? currentStage(d.data) : undefined
    return (stage?.groups ?? []).map(g => ({ competition: live[i], groupId: g.id }))
  })
  const groupDetails = useQueries({
    queries: groups.map(g => ({ queryKey: ['v2', 'groups', g.groupId], queryFn: () => resultsApi.group(g.groupId), enabled, staleTime: STALE })),
  })

  // On a direct load the session is still being restored (auth/me); wait, or a signed-in player would bounce to /login.
  if (authLoading) return <div className="loader" />
  if (!user) return <Navigate to="/login" replace />
  if (!playerId) return <Message>A tua conta não está ligada a nenhum jogador.</Message>
  const settled = (q: { data?: unknown; isError: boolean }) => !!q.data || q.isError
  const pending = cards.isLoading || !details.every(settled) || !groupDetails.every(settled)
  if (pending) return <div className="loader" />

  const mine: MyGamesTarget[] = groupDetails.flatMap((q, i) =>
    q.data?.members.some(m => m.id === playerId) ? [{ competition: groups[i].competition, group: q.data }] : [],
  )
  const target = pickTarget(mine)
  if (target) return <Navigate to={landingPath(target)} replace />

  if (cards.isError) return <Message>Não foi possível carregar as competições. Tenta outra vez.</Message>
  if (live.length === 0) return <Message>Não há nenhuma competição a decorrer.</Message>
  return (
    <Message>
      Não estás em nenhuma divisão da competição a decorrer.
      <span className="flex flex-wrap justify-center gap-[12px] mt-[12px]">
        {live.map(c => (
          <Link key={c.id} to={`/competitions/${c.id}`} className="underline">{c.label}</Link>
        ))}
      </span>
    </Message>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="l-grid">
      <p className="text-center text-[15px] py-[40px] px-[16px]">
        {children}
        <span className="block mt-[12px]"><Link to="/tournaments" className="underline">Ver torneios</Link></span>
      </p>
    </div>
  )
}
