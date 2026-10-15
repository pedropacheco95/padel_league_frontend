import { Link } from 'react-router-dom'
import type { PlayerRef } from '@/api/v2'

const FALLBACK = '/static/images/Player/default_player.jpg'

export default function PlayerAvatar({ player, size = 32, withName = false, link = true }: {
  player?: PlayerRef | null
  size?: number
  withName?: boolean
  link?: boolean
}) {
  const img = (
    <img
      src={player?.pictureUrl || FALLBACK}
      alt={player?.name ?? 'Jogador desconhecido'}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK }}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  )
  const body = (
    <span className="inline-flex items-center gap-[8px] min-w-0">
      {img}
      {withName && <span className="truncate text-[14px]">{player?.name ?? '—'}</span>}
    </span>
  )
  if (!link || !player) return body
  return <Link to={`/players/${player.id}`} className="min-w-0" style={{ color: 'inherit' }}>{body}</Link>
}
