import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerRef } from '@/api/v2'

const FALLBACK = '/static/images/Player/default_player.jpg'

function initials(name?: string | null) {
  return (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export default function PlayerAvatar({ player, size = 32, withName = false, link = true }: {
  player?: PlayerRef | null
  size?: number
  withName?: boolean
  link?: boolean
}) {
  // pictureUrl → site default picture → initials (the default lives on Flask, absent in mock mode).
  const [stage, setStage] = useState<0 | 1 | 2>(player?.pictureUrl && player.pictureUrl !== FALLBACK ? 0 : 1)
  const box = { width: size, height: size, borderRadius: '50%', flexShrink: 0 } as const
  const img =
    stage === 2 ? (
      <span
        aria-label={player?.name ?? 'Jogador desconhecido'}
        className="inline-flex items-center justify-center font-semibold text-white"
        style={{ ...box, background: '#48A6A7', fontSize: Math.max(10, size * 0.38) }}
      >
        {initials(player?.name)}
      </span>
    ) : (
      <img
        src={stage === 0 ? player?.pictureUrl ?? FALLBACK : FALLBACK}
        alt={player?.name ?? 'Jogador desconhecido'}
        onError={() => setStage((s) => (s === 0 ? 1 : 2))}
        key={stage}
        style={{ ...box, objectFit: 'cover' }}
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
