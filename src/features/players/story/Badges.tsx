// Conquistas: the player's badges block and the public catalogue (/conquistas, /conquistas/:key).
// Rules, names and every sentence come from the backend registry (padel_league/services/badges.py).
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/v2'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import { v2get } from '@/features/competitions/v2http'
import './story.scss'

type S = components['schemas']
type PlayerBadges = S['PlayerBadges']
type BadgeCatalogue = S['BadgeCatalogue']
type BadgeDetail = S['BadgeDetail']
type BadgeTheme = S['BadgeTheme']
type CatalogueBadge = BadgeCatalogue['badges'][number]

/** The catalogue's badges grouped by theme, themes in the API's order, each group keeping the
 *  catalogue's rarest-first order. Themes without a badge are left out. */
export function groupByTheme(themes: BadgeTheme[], badges: CatalogueBadge[]) {
  return themes
    .map((t) => ({ ...t, badges: badges.filter((b) => b.theme === t.key) }))
    .filter((g) => g.badges.length > 0)
}

export const TIER_COLOR: Record<string, string> = {
  comum: '#9ACBD0',
  rara: '#4DB8BD',
  epica: '#FF6B6B',
  lendaria: '#FFD93D',
}

function Medal({ tier, earned, size = 40 }: { tier: string; earned: boolean; size?: number }) {
  const c = earned ? TIER_COLOR[tier] ?? '#9ACBD0' : '#d5dcdd'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M13 2h14l-3 11h-8z" fill={earned ? '#006A71' : '#c4cccd'} />
      <circle cx="20" cy="25" r="12" fill={c} stroke={earned ? '#004F53' : '#b9c2c3'} strokeWidth="2" />
      <path d="M20 18l2.1 4.4 4.8.6-3.5 3.3.9 4.7-4.3-2.3-4.3 2.3.9-4.7-3.5-3.3 4.8-.6z" fill={earned ? '#004F53' : '#fff'} opacity={earned ? 0.85 : 1} />
    </svg>
  )
}

export function BadgesBlock({ data }: { data: PlayerBadges }) {
  const [info, setInfo] = useState(false)
  return (
    <div className="badges-card">
      <div className="badges-hd">
        <h3>Conquistas <small>{data.countLine.text}</small></h3>
        <button type="button" className="info-btn" aria-expanded={info} aria-label="O que são as conquistas?" onClick={() => setInfo((v) => !v)}>i</button>
      </div>
      {info && <p className="badges-info">{data.info.text}</p>}
      <div className="badges">
        {data.items.map((b) => (
          <Link key={b.key} to={`/conquistas/${b.key}`} className={`badge${b.earned ? '' : ' locked'}`}>
            <Medal tier={b.tier} earned={b.earned} />
            <b>{b.name}</b>
            <span className="tier" style={{ color: b.earned ? undefined : '#8a9799' }}>{b.tierLabel} · {b.rarityPct.toLocaleString('pt-PT')}%</span>
            {!b.earned && b.fraction != null && (
              <span className="bar"><i style={{ width: `${Math.round(b.fraction * 100)}%` }} /></span>
            )}
            {!b.earned && b.progress && <span className="prog">{b.progress.text}</span>}
          </Link>
        ))}
      </div>
      <Link to="/conquistas" className="more">Ver todas as conquistas</Link>
    </div>
  )
}

export function BadgesCataloguePage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['v2', 'badges'], queryFn: () => v2get<BadgeCatalogue>('/badges') })
  if (isLoading) return <div className="loader" />
  if (error || !data) return <p className="text-center py-[24px]">Não foi possível carregar as conquistas.</p>
  return (
    <div className="pstory">
      <section className="light" style={{ paddingTop: 28 }}>
        <div className="wrap on-light">
          <h2 className="sec">Conquistas</h2>
          <p className="lede">{data.info.text}</p>
          {groupByTheme(data.themes, data.badges).map((g) => (
            <section key={g.key} className="cat-theme" aria-labelledby={`theme-${g.key}`}>
              <h3 id={`theme-${g.key}`} className="cat-h">{g.label} <small>{g.badges.length}</small></h3>
              <div className="cat">
                {g.badges.map((b) => (
                  <Link key={b.key} to={`/conquistas/${b.key}`} className="cat-row">
                    <Medal tier={b.tier} earned size={44} />
                    <div className="cat-main">
                      <div className="cat-top"><b>{b.name}</b><span className="pilltier" style={{ background: TIER_COLOR[b.tier] }}>{b.tierLabel}</span></div>
                      <div className="cat-rule">{b.rule}</div>
                      <div className="cat-meta">
                        {b.rarityLine.text} · {b.holdersLine?.text}
                        <span className="cat-avs">
                          {b.holders.slice(0, 6).map((p) => <PlayerAvatar key={p.id} player={p} size={20} link={false} />)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}

export function BadgeDetailPage() {
  const key = useParams().key ?? ''
  const { data, isLoading, error } = useQuery({ queryKey: ['v2', 'badges', key], queryFn: () => v2get<BadgeDetail>(`/badges/${key}`) })
  if (isLoading) return <div className="loader" />
  if (error || !data) {
    return <p className="text-center py-[24px]">Conquista não encontrada. <Link to="/conquistas">Ver todas</Link></p>
  }
  return (
    <div className="pstory">
      <section className="light" style={{ paddingTop: 28 }}>
        <div className="wrap on-light">
          <Link to="/conquistas" className="back">← Conquistas</Link>
          <div className="bd-hd">
            <Medal tier={data.tier} earned size={64} />
            <div>
              <h2 className="sec" style={{ margin: 0 }}>{data.name}</h2>
              <span className="pilltier" style={{ background: TIER_COLOR[data.tier] }}>{data.tierLabel}</span>
            </div>
          </div>
          <p className="lede">{data.rule}</p>
          <p className="lede" style={{ color: '#4d4d4d' }}>{data.rarityLine.text} · {data.holdersLine?.text}</p>
          <h3 className="bd-h">Quem tem</h3>
          {data.holders.length === 0 ? (
            <p className="lede">Ainda ninguém.</p>
          ) : (
            <ul className="bd-list">
              {data.holders.map((p) => (
                <li key={p.id}><Link to={`/players/${p.id}`}><PlayerAvatar player={p} size={28} link={false} /> {p.name}</Link></li>
              ))}
            </ul>
          )}
          {data.closest.length > 0 && (
            <>
              <h3 className="bd-h">Quem está mais perto</h3>
              <ul className="bd-list">
                {data.closest.map((c) => (
                  <li key={c.player.id}>
                    <Link to={`/players/${c.player.id}`}><PlayerAvatar player={c.player} size={28} link={false} /> {c.player.name}</Link>
                    <span>{c.progress?.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
