import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Match, Participant } from '@/api/v2'
import PlayerAvatar from './PlayerAvatar'

const OUTCOME_LABEL: Record<string, string> = {
  timeout_draw: 'empate (tempo)',
  not_started_draw: 'empate (não iniciado)',
  walkover: 'W.O.',
}

function SideRow({ parts, score, won }: { parts: Participant[]; score?: ReactNode; won: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[8px] py-[4px]">
      <div className="flex flex-col gap-[4px] min-w-0">
        {[1, 2].map((slot) => {
          const p = parts.find((x) => x.slot === slot)
          return (
            <div key={slot} className="flex items-center gap-[6px] min-w-0">
              <PlayerAvatar player={p?.player} size={24} withName />
              {!p?.player && <span className="text-[14px] text-gray-500 italic">{p?.role === 'unknown' ? 'Substituto' : '—'}</span>}
              {p?.role === 'substitute' && <span className="text-[11px] px-[6px] rounded-full bg-amber-100 text-amber-800">sub</span>}
            </div>
          )
        })}
      </div>
      <div className={`flex gap-[6px] text-[18px] tabular-nums ${won ? 'font-bold' : 'text-gray-600'}`}>{score}</div>
    </div>
  )
}

export default function MatchCard({ match, actions, showGroup = false }: { match: Match; actions?: ReactNode; showGroup?: boolean }) {
  const home = match.participants.filter((p) => p.side === 'home')
  const away = match.participants.filter((p) => p.side === 'away')
  const multiSet = match.sets.length > 1
  const played = match.status === 'played' || match.status === 'walkover'
  const score = (s: 'home' | 'away') => {
    if (!played) return null
    if (multiSet) {
      return match.sets.map((set) => (
        <span key={set.setNo} className="w-[20px] text-center">{s === 'home' ? set.homeGames ?? '–' : set.awayGames ?? '–'}</span>
      ))
    }
    return <span>{s === 'home' ? match.homeScore ?? '–' : match.awayScore ?? '–'}</span>
  }
  const specialOutcomes = match.sets.filter((s) => s.outcome !== 'completed')
  const when = match.scheduledAt ? new Date(match.scheduledAt) : null

  return (
    <div className="rounded-[12px] border border-gray-200 bg-white p-[12px] shadow-sm w-full">
      <div className="flex items-center justify-between text-[12px] text-gray-500 mb-[6px] gap-[8px]">
        <span className="truncate">
          {showGroup && match.groupName ? (
            <Link to={`/groups/${match.groupId}`} style={{ color: 'inherit' }} className="underline">{match.groupName}</Link>
          ) : null}
          {showGroup && match.groupName ? ' · ' : ''}Jornada {match.round}
          {match.court ? ` · ${match.court}` : ''}
        </span>
        <span className="whitespace-nowrap">
          {when ? when.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
          {match.status === 'cancelled' ? ' · Cancelado' : ''}
        </span>
      </div>
      <SideRow parts={home} score={score('home')} won={match.winner === 'home'} />
      <div className="border-t border-gray-100" />
      <SideRow parts={away} score={score('away')} won={match.winner === 'away'} />
      {multiSet && played && match.homeScore !== null && match.homeScore !== undefined && (
        <div className="text-[12px] text-gray-500 text-right mt-[4px]">Pontos: {match.homeScore} – {match.awayScore}</div>
      )}
      {specialOutcomes.length > 0 && (
        <div className="text-[12px] text-gray-500 mt-[4px]">
          {specialOutcomes.map((s) => `Set ${s.setNo}: ${OUTCOME_LABEL[s.outcome] ?? s.outcome}`).join(' · ')}
        </div>
      )}
      {match.absences && match.absences.length > 0 && (
        <div className="text-[12px] text-gray-500 mt-[4px]">
          Faltas: {match.absences.map((a) => `${a.player.name}${a.substitute ? ` → ${a.substitute.name}` : ''}`).join(', ')}
        </div>
      )}
      {actions && <div className="flex flex-wrap gap-[8px] mt-[8px] justify-end">{actions}</div>}
    </div>
  )
}
