// New player page, Proposta A ("Uma página, uma história"): the player's career as one PPL night,
// J1–J7, then the ficha (últimos jogos, todos os torneios, comparar). Preview route /players/:id/novo.
// Every sentence comes from the backend copy catalogue (padel_league/services/player_story.py);
// this file only lays it out. Blocks the backend sends as null are hidden.
import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MatchCard from '@/components/v2/MatchCard'
import PlayerAvatar from '@/components/v2/PlayerAvatar'
import { formatPoints } from '@/components/v2/PointsValue'
import { V2NotFound } from '@/features/competitions/v2http'
import { FORMAT_COLOR, formatLabel } from '@/features/competitions/format'
import { useRankingExplanation } from '@/features/ranking/api'
import { playedAsSub } from '@/features/ranking/subs'
import PlayerCompare from '../PlayerCompare'
import { byRanking, useV2Player, useV2PlayerMatches, useV2Players } from '../api'
import { useV2PlayerStory } from './api'
import {
  C, ConstellationMap, Fingerprint, Flame, HERO_STYLE, Mountain, NightsGrid, Skyline, TWIN_A, TWIN_B,
  type PlayerStory,
} from './art'
import './story.scss'

const FALLBACK = '/static/images/Player/default_player.jpg'

const initials = (name?: string | null) =>
  (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

function Kick({ j, name }: { j: string; name: string }) {
  return (
    <div className="kick">
      <span className="j">{j}</span>
      <span className="n">{name}</span>
      <span className="rule" />
    </div>
  )
}

function Record({ w, d, l }: { w: number; d: number; l: number }) {
  return (
    <div className="rec">
      <span className="v">{w}V</span>
      <span className="e">{d}E</span>
      <span className="d">{l}D</span>
    </div>
  )
}

function Hero({ story, player }: { story: PlayerStory; player: NonNullable<ReturnType<typeof useV2Player>['data']> }) {
  const { data: explain } = useRankingExplanation(player.id)
  const s = (player.stats ?? {}) as Record<string, number>
  // Counted awards per edition, newest first (the API's order).
  const parts = useMemo(() => {
    const out: { id: number; label: string; format: string; points: number }[] = []
    for (const line of explain?.lines ?? []) {
      if (!line.counted || !line.competition) continue
      const pts = (line.placePoints ?? 0) + (line.bonusPoints ?? 0)
      const known = out.find((p) => p.id === line.competition!.id)
      if (known) known.points += pts
      else {
        const c = line.competition
        const ed = c.editionNumber ? `${c.editionNumber}ª` : c.label
        out.push({ id: c.id, label: c.format === 'classica' ? ed : `${ed} ${formatLabel(c)}`, format: c.format, points: pts })
      }
    }
    return out
  }, [explain])
  const segColor = (format: string, i: number) =>
    format === 'classica' ? (i % 2 ? C.secondary : '#ffffff') : FORMAT_COLOR[format as keyof typeof FORMAT_COLOR] ?? C.secondary
  const name = player.fullName || player.name
  const fp = story.fingerprint
  return (
    <section className="hero">
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="avatar" style={{ backgroundImage: `url(${player.pictureUrl || FALLBACK})` }}>
          <span className="flag" />
        </div>
        <h1>{name}</h1>
        {story.hero.line && <div className="hsub">{story.hero.line.text}</div>}
        {story.archetype?.name && <div className="sig-chip">{story.archetype.name}</div>}
        <div className="rank">
          <div>
            <small>RANKING</small>
            <strong>{player.rankingPosition ?? '—'}{player.rankingPosition ? <sup>º</sup> : null}</strong>
          </div>
          <div>
            <small>PONTOS</small>
            <strong>{formatPoints(player.rankingPoints, 0)}</strong>
          </div>
        </div>
        {parts.length > 0 && (
          <div className="brk">
            {story.hero.pointsLine && <div className="cap">{story.hero.pointsLine.text}</div>}
            <div className="bar">
              {parts.map((p, i) => <i key={p.id} style={{ flex: Math.max(p.points, 1), background: segColor(p.format, i) }} />)}
            </div>
            <div className="lg">
              {parts.map((p) => <span key={p.id}>{p.label} <b>{formatPoints(p.points, 0)}</b></span>)}
            </div>
          </div>
        )}
        {(s.matchesPlayed ?? 0) > 0 && (
          <div className="tot">
            <div><strong>{s.matchesPlayed}</strong><small>Jogos</small></div>
            <div className="w"><strong>{s.matchesWon}</strong><small>Vitórias</small></div>
            <div><strong>{Math.round(s.efficiency ?? 0)}%</strong><small>Eficácia</small></div>
            <div><strong>{s.matchesDrawn}</strong><small>Empates</small></div>
            <div className="l"><strong>{s.matchesLost}</strong><small>Derrotas</small></div>
            <div><strong>{s.matchweeksPlayed}</strong><small>Jornadas · {Math.round(s.attendance ?? 0)}%</small></div>
          </div>
        )}
        {fp && fp.rings.length > 0 && (
          <div className="fp-wrap on-dark">
            <Kick j="J1" name="Impressão digital" />
            <div className="fp-plate">
              <Fingerprint seed={player.id} rings={fp.rings} style={HERO_STYLE} size={358} next={fp.next ? `${fp.next.edition} ${(fp.next.label ?? '').split(' ')[0]}`.trim() : null} labels center={String(player.id)} />
            </div>
            <div className="fp-legend">
              <span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill={C.yellow} /></svg>vitória</span>
              <span><svg width="12" height="12"><circle cx="6" cy="6" r="3" fill={C.secondary} /></svg>derrota</span>
              <span><svg width="12" height="12"><circle cx="6" cy="6" r="3.5" fill="none" stroke="#fff" /></svg>empate</span>
              <span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke={C.yellow} strokeWidth="3" /></svg>título</span>
              <span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="#fff" strokeDasharray="4 3" /></svg>2ª divisão ou abaixo</span>
              <span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke={C.shuffleRing} strokeWidth="1.5" /></svg>Shuffle</span>
            </div>
            {fp.note && <div className="fp-note">{fp.note.text}</div>}
          </div>
        )}
      </div>
    </section>
  )
}

function People({ data }: { data: NonNullable<PlayerStory['people']> }) {
  const k = data.carrasco
  return (
    <div className="blk">
      <Kick j="J3" name="Carrascos e clientes" />
      <h2 className="sec">{data.title.text}</h2>
      <div className="cc">
        <div className="card-d carrasco">
          <div className="lab">O carrasco</div>
          {k ? (
            <>
              <Link to={`/players/${k.player.id}/novo`} className="who">
                <PlayerAvatar player={k.player} size={34} link={false} />
                <b>{k.player.name}</b>
              </Link>
              <Record w={k.wins} d={k.draws} l={k.losses} />
              <div className="big">{signed(k.diff)}</div>
              {k.gamesLine && <div className="line">{k.gamesLine.text}</div>}
            </>
          ) : null}
          {data.carrascoLine && <div className="line" style={{ color: '#fff' }}>{data.carrascoLine.text}</div>}
        </div>
        <div className="card-d cliente">
          <div className="lab">Os clientes</div>
          {data.clientes.length > 0 && (
            <div className="cl-list">
              {data.clientes.map((c) => (
                <Link key={c.player.id} to={`/players/${c.player.id}/novo`} className="cl-row">
                  <PlayerAvatar player={c.player} size={34} link={false} />
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{c.player.name}</div>
                    <div className="sm">{c.wins}V {c.draws}E {c.losses}D</div>
                  </div>
                  <span className="pm">{signed(c.diff)}</span>
                </Link>
              ))}
            </div>
          )}
          {data.clientes.length > 0 && <div className="line" style={{ marginTop: 10 }}>diferença de jogos.</div>}
          {data.clientesLine && <div className="line" style={{ color: '#fff' }}>{data.clientesLine.text}</div>}
        </div>
      </div>
      {data.paradox && <div className="paradox">{data.paradox.text}</div>}
    </div>
  )
}

function Constellation({ data, name }: { data: NonNullable<PlayerStory['constellation']>; name: string }) {
  return (
    <div className="blk">
      <Kick j="J4" name="A constelação" />
      <h2 className="sec">{data.title.text}</h2>
      <p className="lede">{data.lede.text}{data.strangers ? ` ${data.strangers.lede?.text ?? ''}` : ''}</p>
      <ConstellationMap data={data} initials={initials(name)} />
      <div className="const-stats">
        <div><strong>{data.met}</strong><small>{data.totalLine?.text}</small></div>
        <div><strong>{data.degree2}</strong><small>a 2 graus</small></div>
        <div><strong>{data.degree3}</strong><small>a 3 graus</small></div>
      </div>
      {data.strangers && (data.strangers.list?.length ?? 0) > 0 && (
        <div className="never">
          <div className="t">{data.strangers.title?.text}</div>
          <ul>
            {data.strangers.list!.map((s) => (
              <li key={s.player!.id}>
                <Link to={`/players/${s.player!.id}/novo`}>{s.player!.name}</Link>
                <span>{s.line?.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Rival({ data, me, story, onCompare }: {
  data: NonNullable<PlayerStory['rival']>
  me: { id: number; name: string }
  story: PlayerStory
  onCompare: () => void
}) {
  return (
    <div className="blk">
      <Kick j="J5" name="O rival" />
      <h2 className="sec">{data.title.text}</h2>
      <div className="h2h">
        <div className="nm">{me.name}</div>
        <div className="score">{data.wins}<i>·</i>{data.losses}</div>
        <div className="nm">{data.player.name}</div>
      </div>
      <div className="split">
        <i style={{ flex: data.wins, background: C.yellow }} />
        <i style={{ flex: data.draws, background: '#fff', opacity: 0.5 }} />
        <i style={{ flex: data.losses, background: C.coral }} />
      </div>
      <div className="split-l">
        {(data.split ?? []).map((l) => <span key={l.key}>{l.text}</span>)}
      </div>
      <div className="twins">
        <div className="twin">
          <Fingerprint seed={me.id} rings={story.fingerprint?.rings ?? []} style={TWIN_A} size={150} />
          <div className="cap"><b>{me.name}</b>{story.fingerprint?.caption?.text}</div>
        </div>
        <div className="twin">
          <Fingerprint seed={data.player.id} rings={data.rings} style={TWIN_B} size={150} />
          <div className="cap"><b>{data.player.name}</b>{data.caption?.text}</div>
        </div>
      </div>
      {data.togetherLine && <div className="together">{data.togetherLine.text}</div>}
      <button type="button" className="btn btn-y" onClick={onCompare}>Comparar com {data.player.name}</button>
    </div>
  )
}

function NightsBlock({ data }: { data: NonNullable<PlayerStory['nights']> }) {
  return (
    <div className="blk">
      <Kick j="J6" name="Todas as noites" />
      <h2 className="sec">{data.title.text}</h2>
      <p className="lede">{data.lede.text} Uma coluna por semana.</p>
      <NightsGrid data={data} />
      <div className="cal-lg">
        <span><i style={{ background: C.yellow }} />+6 ou mais</span>
        <span><i style={{ background: C.primaryLight }} />+1 a +5</span>
        <span><i style={{ background: 'rgba(255,255,255,.22)' }} />0 ou menos</span>
        <span><i style={{ border: `1px solid ${C.coral}` }} />falta</span>
      </div>
      {data.estimatedNote && <div className="cal-note">{data.estimatedNote.text}</div>}
      {data.best && (
        <div className="night-best">
          <div className="n">{signed(data.best.net ?? 0)}</div>
          <div className="t">
            <b>{data.best.line?.text}</b>
            <br />
            {data.best.label}{data.best.scores?.length ? ` · ${data.best.scores.join(', ')}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function Streaks({ data }: { data: NonNullable<PlayerStory['streaks']> }) {
  return (
    <>
      <h2 className="sec">{data.title.text}</h2>
      <div className="streaks">
        {data.items.map((s) => (
          <div key={s.key} className={`stk${s.alive ? '' : ' out'}`}>
            <div className="ico"><Flame lit={s.alive} /></div>
            <strong>{s.current}</strong>
            <div className="lb">{s.label}</div>
            <span className={`st ${s.alive ? 'live' : 'off'}`}>{s.alive ? 'Viva' : 'Apagada'}</span>
            <div className="rb">{s.line.text}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function Signature({ data }: { data: NonNullable<PlayerStory['archetype']> }) {
  const t = data.traits
  return (
    <div className="sig-card">
      <div className="sig-top">
        <div className="t">Assinatura</div>
        {data.name && <div className="name">{data.name}</div>}
        <div className="why">{data.line.text}</div>
        {data.matches > 0 && <Skyline counts={data.skyline} />}
      </div>
      {data.key && (
        <div className="traits">
          <div className="trait">
            <div className="k">Sangue-frio</div>
            <div className="v">{t.tight?.pct ?? '—'}{t.tight?.pct != null ? '%' : ''}</div>
            <div className="d">{t.tight?.line?.text}</div>
          </div>
          <div className="trait">
            <div className="k">Diesel</div>
            <div className="v">
              {t.diesel ? t.diesel.map((v, i) => <span key={i}>{i > 0 && <small>→</small>}{v}</span>) : '—'}
            </div>
            <div className="d">% de vitórias no 1º, 2º e 3º jogo da noite</div>
          </div>
          <div className="trait">
            <div className="k">Noites perfeitas</div>
            <div className="v">{t.perfectNights}</div>
            <div className="d">jornadas com 3 vitórias em 3</div>
          </div>
          <div className="trait">
            <div className="k">Remontadas</div>
            <div className="v">{t.comebacks}</div>
            <div className="d">noites que começaram com derrota e acabaram com 2 vitórias</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pos({ place }: { place?: number | null }) {
  if (place == null) return <>—</>
  if (place === 1) return <span className="pos1">1</span>
  return <span className={place <= 3 ? 'pos-pod' : place >= 7 ? 'pos-low' : ''}>{place}º</span>
}

export default function PlayerStoryPage() {
  const id = Number(useParams().id)
  const { data: player, isLoading, error } = useV2Player(id)
  const { data: story } = useV2PlayerStory(id)
  const { data: list } = useV2Players()
  const { data: matches } = useV2PlayerMatches(id)
  const [other, setOther] = useState<number | null>(null)
  const [allGames, setAllGames] = useState(false)
  const compareRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => [...(list ?? [])].sort(byRanking), [list])
  const { memberMatches, subsMatches } = useMemo(() => {
    const newest = (l: typeof matches) =>
      [...(l ?? [])].sort((x, y) => (y.scheduledAt ? Date.parse(y.scheduledAt) : 0) - (x.scheduledAt ? Date.parse(x.scheduledAt) : 0))
    const all = matches ?? []
    const subs = player?.substituteMatches ?? all.filter((m) => playedAsSub(m, id))
    const subIds = new Set(subs.map((m) => m.id))
    return { memberMatches: newest(all.filter((m) => !subIds.has(m.id))), subsMatches: newest(subs) }
  }, [matches, player?.substituteMatches, id])

  if (isLoading) return <div className="loader" />
  if (error || !player) {
    return (
      <div className="l-grid">
        <p className="c-player__message">
          {error instanceof V2NotFound ? 'Jogador não encontrado.' : 'Não foi possível carregar este jogador.'}{' '}
          <Link to="/players">Ver todos os jogadores</Link>
        </p>
      </div>
    )
  }

  const history = player.history ?? []
  const shortName = player.name
  const compareWith = (pid: number) => {
    setOther(pid)
    compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const s = story
  const darkBand = s && (s.people || s.constellation || s.rival || s.nights)
  const shownGames = allGames ? memberMatches : memberMatches.slice(0, 2)

  return (
    <div className="pstory">
      <div className="preview-note">
        Pré-visualização da nova página. <Link to={`/players/${id}`}>Ver a página atual</Link>
      </div>
      {s ? <Hero story={s} player={player} /> : <div className="loader" />}

      {s?.mountain && (
        <section className="mount on-light">
          <div className="wrap">
            <Kick j="J2" name="A montanha" />
            <h2 className="sec">{s.mountain.title.text}</h2>
            <p className="lede">{s.mountain.lede.text}</p>
            <div className="chart"><Mountain points={s.mountain.points} next={s.mountain.next} /></div>
          </div>
        </section>
      )}

      {s && darkBand && (
        <section className="dark on-dark">
          <div className="wrap">
            {s.people && <People data={s.people} />}
            {s.constellation && <Constellation data={s.constellation} name={player.fullName || player.name} />}
            {s.rival && (
              <Rival data={s.rival} me={{ id, name: shortName }} story={s} onCompare={() => compareWith(s.rival!.player.id)} />
            )}
            {s.nights && <NightsBlock data={s.nights} />}
          </div>
        </section>
      )}

      {s?.nights?.next?.line && (
        <div className="seam"><div className="spill">{s.nights.next.line.text}</div></div>
      )}

      {s && (s.streaks || s.archetype) && (
        <section className="light on-light">
          <div className="wrap">
            <Kick j="J7" name="Sequências e assinatura" />
            {s.streaks && <Streaks data={s.streaks} />}
            {s.archetype && <Signature data={s.archetype} />}
          </div>
        </section>
      )}

      <section className="games">
        <div className="wrap">
          <h2 className="site-h">Últimos jogos</h2>
          <div className="list">
            {memberMatches.length === 0 && <p className="text-center text-[15px] text-gray-500">Sem jogos registados.</p>}
            {shownGames.map((m) => <MatchCard key={m.id} match={m} showGroup />)}
          </div>
          {memberMatches.length > 2 && (
            <button type="button" className="more" onClick={() => setAllGames((v) => !v)}>
              {allGames ? 'Mostrar menos' : `Ver todos os ${memberMatches.length} jogos`}
            </button>
          )}
          {subsMatches.length > 0 && (
            <div className="subs">
              <h3>Como substituto · {subsMatches.length} {subsMatches.length === 1 ? 'jogo' : 'jogos'}</h3>
              <div className="flex flex-col gap-[12px] p-[12px]">
                {subsMatches.map((m) => <MatchCard key={m.id} match={m} showGroup />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="tbl-wrap">
          <div className="wrap">
            <h2 className="site-h">Todos os torneios</h2>
            <div className="tbl">
              <div className="tr hd">
                <span>Torneio</span><span className="c">Formato</span><span className="c">Pos.</span>
                <span className="c">J</span><span className="c">V</span><span className="r">Pts</span>
              </div>
              {history.map((row, i) => {
                const [ed, ...rest] = (row.label ?? '').split(' - ')
                const upcoming = row.place == null && row.played == null
                return (
                  <div key={i} className={`tr${upcoming ? ' next' : ''}`}>
                    <Link className="nm" to={row.groupId ? `/groups/${row.groupId}` : `/competitions/${row.competition?.id}`}>
                      <span className="e">{ed}</span>{rest.length ? ` - ${rest.join(' - ')}` : ''}
                    </Link>
                    <span className="c">
                      {row.competition && (
                        <span className="pill" style={{ background: FORMAT_COLOR[row.competition.format] ?? '#374151' }}>
                          {formatLabel(row.competition)}
                        </span>
                      )}
                    </span>
                    <span className="c"><Pos place={row.place} /></span>
                    <span className="c">{row.played ?? '—'}</span>
                    <span className="c">{row.wins ?? '—'}</span>
                    <span className="r">{row.awardPoints != null ? formatPoints(row.awardPoints, 0) : '—'}</span>
                  </div>
                )
              })}
            </div>
            {s?.hero.tableNote && <div className="tbl-foot">{s.hero.tableNote.text}</div>}
          </div>
        </section>
      )}

      <div className="wrap" ref={compareRef}>
        <div className="cmp">
          <div className="t">Comparar</div>
          <select value={other ?? ''} onChange={(e) => setOther(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Escolher jogador…</option>
            {sorted.filter((p) => p.id !== id).map((p) => (
              <option key={p.id} value={p.id}>{p.fullName || p.name}</option>
            ))}
          </select>
          {other && <div className="res"><PlayerCompare a={id} b={other} /></div>}
        </div>
      </div>
    </div>
  )
}
