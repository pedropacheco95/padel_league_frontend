// Deterministic SVG art for the player story page (Proposta A). Ported from the mock
// (scratchpad playerpage2/a/work/template.html). No randomness: the only jitter is h(),
// a hash of (player id, match id), so the same data always draws the same picture.
import type { components } from '@/api/v2'

type S = components['schemas']
export type StoryRing = S['StoryRing']
export type PlayerStory = S['PlayerStory']

export const C = {
  primary: '#006A71',
  primaryDark: '#004F53',
  primaryLight: '#4DB8BD',
  secondary: '#9ACBD0',
  secondaryLight: '#CBE5E7',
  yellow: '#FFD93D',
  coral: '#FF6B6B',
  shuffle: '#b45309',
  shuffleRing: '#f0a35e',
  ink: '#281e1e',
}
const FONT = 'Gemunu Libre'

// ---------- fingerprint ----------

export function h(a: number, b: number) {
  let x = (a * 73856093) ^ (b * 19349663)
  x = (x ^ (x >>> 13)) * 1274126177
  x ^= x >>> 16
  return ((x >>> 0) % 10000) / 10000
}

function spline(pts: [number, number][]) {
  const n = pts.length
  if (n === 0) return ''
  let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1)
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += 'C' + c1.map((v) => v.toFixed(1)) + ' ' + c2.map((v) => v.toFixed(1)) + ' ' + p2.map((v) => v.toFixed(1))
  }
  return d + 'Z'
}

export type FingerprintStyle = {
  ink: string
  win: string
  loss: string
  title: string
  shuf: string
  tw: number
  lw: number
  r0?: number
  ds?: number
}

export const HERO_STYLE: FingerprintStyle = {
  ink: '#ffffff', win: C.yellow, loss: C.secondary, title: C.yellow, shuf: C.shuffleRing, tw: 2.6, lw: 1,
}
const TWIN: FingerprintStyle = { ink: '#ffffff', win: C.yellow, loss: C.secondary, title: C.yellow, shuf: C.shuffleRing, tw: 3.2, lw: 1.3, r0: 22, ds: 1.4 }
export const TWIN_A = TWIN
export const TWIN_B: FingerprintStyle = { ...TWIN, win: C.coral, title: C.coral }

const R = 178

export function Fingerprint({
  seed, rings, style, size, next, center, labels,
}: {
  seed: number
  rings: StoryRing[]
  style: FingerprintStyle
  size: number
  next?: string | null
  center?: string
  labels?: boolean
}) {
  // Rings fill the plate up to a step of 22 (a rookie's one ring stays a ring, not a star).
  const r0 = (style.r0 ?? 30) + 20
  const step = Math.min((R - r0) / Math.max(rings.length, 1), 22)
  const amp = step * 0.55
  const ds = style.ds ?? 1
  const els: JSX.Element[] = []
  if (next) {
    els.push(<circle key="next" r={R + 6} fill="none" stroke={style.ink} strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="1.5 4.5" />)
  }
  rings.forEach((e, i) => {
    const r = r0 + i * step
    const n = e.matches.length
    const pts: [number, number][] = []
    const marks: [[number, number], number][] = []
    e.matches.forEach(([m, id], j) => {
      const a = -Math.PI / 2 + (2 * Math.PI * (j + 0.5)) / n
      const c = Math.max(-8, Math.min(8, m))
      const rr = r + (c / 8) * amp + (h(seed, id) - 0.5) * 0.6
      const p: [number, number] = [rr * Math.cos(a), rr * Math.sin(a)]
      pts.push(p)
      marks.push([p, m])
    })
    const title = e.title
    const t2 = (e.tier ?? 1) > 1
    const shuf = e.format === 'shuffle'
    if (n >= 3) {
      els.push(
        <path
          key={`r${i}`}
          d={spline(pts)}
          fill="none"
          stroke={title ? style.title : shuf ? style.shuf : style.ink}
          strokeWidth={title ? style.tw : style.lw}
          strokeOpacity={title ? 1 : 0.8}
          strokeDasharray={t2 ? '4 3' : undefined}
        />,
      )
    } else {
      // Too few matches for a curve: the plain ring.
      els.push(
        <circle key={`r${i}`} r={r} fill="none" stroke={title ? style.title : shuf ? style.shuf : style.ink}
          strokeWidth={title ? style.tw : style.lw} strokeOpacity={title ? 1 : 0.8} strokeDasharray={t2 ? '4 3' : undefined} />,
      )
    }
    marks.forEach(([p, m], j) => {
      const rad = (1.1 + Math.min(Math.abs(m), 8) * 0.22) * ds
      const k = `m${i}-${j}`
      if (m > 0) els.push(<circle key={k} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={rad.toFixed(2)} fill={style.win} />)
      else if (m < 0) els.push(<circle key={k} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={(rad * 0.7).toFixed(2)} fill={style.loss} />)
      else els.push(<circle key={k} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={1.6 * ds} fill="none" stroke={style.ink} strokeWidth={0.7} />)
    })
  })
  if (labels && rings.length) {
    const ends = rings.length > 1 ? [0, rings.length - 1] : [0]
    ends.forEach((i) => {
      const r = r0 + i * step
      els.push(
        <text key={`l${i}`} x={(r * 0.707 + 4).toFixed(1)} y={(r * 0.707 + 12).toFixed(1)} fontFamily={FONT} fontSize={12} fontWeight={700} fill={C.secondaryLight}>
          {rings[i].edition}
        </text>,
      )
    })
    if (next) {
      els.push(<text key="ln" x={184} y={176} textAnchor="end" fontFamily={FONT} fontSize={12} fontWeight={700} fill={C.yellow}>{next} →</text>)
    }
  }
  if (center) {
    els.push(<text key="c" y={9} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} fill="#fff">{center}</text>)
  }
  return (
    <svg viewBox="-190 -190 380 380" width={size} height={size} style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }}>
      {els}
    </svg>
  )
}

// ---------- J2 montanha ----------

type MountainPoint = NonNullable<PlayerStory['mountain']>['points'][number]

export function Mountain({ points, next }: { points: MountainPoint[]; next?: { edition?: string; label?: string } | null }) {
  const cols: (MountainPoint | null)[] = [...points, ...(next ? [null] : [])]
  const W = 390, top = 36, base = 200, H = 260, L = 24, Rr = 22
  const n = cols.length
  const dx = n > 1 ? (W - L - Rr) / (n - 1) : 0
  const classic = points.filter((p) => p.format === 'classica' && p.position != null)
  const maxPos = Math.max(8, ...points.map((p) => p.position ?? 0), ...points.map((p) => (p.topSize ?? 0) + 1))
  const y = (p: number) => top + ((p - 1) / (maxPos - 1)) * (base - top - 24)
  const xAt = (i: number) => (n === 1 ? W / 2 : L + i * dx)
  const els: JSX.Element[] = []
  // The profile: Clássica editions joined; it falls to the right edge into the next band.
  const linePts = cols
    .map((p, i) => (p && p.format === 'classica' && p.position != null ? [xAt(i), y(p.position)] as const : null))
    .filter((p): p is readonly [number, number] => p !== null)
  if (linePts.length) {
    const last = linePts[linePts.length - 1]
    let d = `0,${linePts[0][1].toFixed(1)}`
    linePts.forEach(([x, yy]) => { d += ` L${x.toFixed(1)},${yy.toFixed(1)}` })
    d += ` L${Math.min(W, last[0] + Math.max(dx, 20) * 0.5).toFixed(1)},${(last[1] + 10).toFixed(1)} L${W},${(last[1] + 30).toFixed(1)}`
    els.push(<path key="fill" d={`M0,${H} L${d} L${W},${H} Z`} fill={C.primaryDark} />)
    els.push(<path key="edge" d={`M${d}`} fill="none" stroke={C.primaryLight} strokeWidth={2} strokeLinejoin="round" />)
  }
  // Division boundary: below the 1ª Divisão of each edition (stepped when sizes change).
  const bounds = cols.map((p, i) => (p?.topSize ? [xAt(i), y(p.topSize + 0.5)] as const : null)).filter((b): b is readonly [number, number] => b !== null)
  if (bounds.length && points.some((p) => (p.tier ?? 1) > 1)) {
    let d = `M0,${bounds[0][1].toFixed(1)}`
    bounds.forEach(([x, yy], i) => {
      const xm = i === 0 ? 0 : (bounds[i - 1][0] + x) / 2
      d += ` L${xm.toFixed(1)},${(i === 0 ? yy : bounds[i - 1][1]).toFixed(1)} L${xm.toFixed(1)},${yy.toFixed(1)}`
    })
    const yl = bounds[bounds.length - 1][1]
    d += ` L${W},${yl.toFixed(1)}`
    els.push(<path key="div" d={d} fill="none" stroke={C.secondary} strokeOpacity={0.7} strokeDasharray="3 4" />)
    els.push(<text key="d1" x={W - 16} y={yl - 6} textAnchor="end" fontFamily={FONT} fontSize={12} fontWeight={700} fill={C.secondaryLight}>1ª DIVISÃO ↑</text>)
    els.push(<text key="d2" x={W - 16} y={yl + 14} textAnchor="end" fontFamily={FONT} fontSize={12} fontWeight={700} fill={C.secondary}>2ª DIVISÃO ↓</text>)
  }
  cols.forEach((p, i) => {
    const x = xAt(i)
    els.push(
      <text key={`x${i}`} x={x.toFixed(1)} y={H - 10} textAnchor="middle" fontFamily={FONT} fontSize={11} fontWeight={600} fill={p ? C.secondary : C.yellow}>
        {(p ? p.edition : next?.edition ?? '').replace('ª', '')}
      </text>,
    )
    if (!p) {
      els.push(<line key={`n${i}`} x1={x} x2={x} y1={top - 6} y2={H - 26} stroke={C.yellow} strokeDasharray="2 3" />)
      els.push(<text key={`nt${i}`} x={x - 4} y={top - 12} textAnchor="end" fontFamily={FONT} fontSize={12} fontWeight={700} fill="#b38f00">{next?.label} →</text>)
      return
    }
    if (p.format !== 'classica') {
      if (p.place == null) return
      const yy = y(Math.min(p.place, maxPos))
      els.push(<circle key={`p${i}`} cx={x} cy={yy} r={4.5} fill={C.shuffle} stroke="#fff" strokeWidth={1.5} />)
      els.push(<text key={`pt${i}`} x={x} y={yy - 10} textAnchor="middle" fontFamily={FONT} fontSize={13} fontWeight={600} fill={C.ink}>{p.format === 'shuffle' ? 'Shuffle' : 'Teams'} {p.place}º</text>)
      return
    }
    if (p.position == null) return
    const yy = y(p.position)
    if (p.title) {
      els.push(<line key={`f${i}`} x1={x} x2={x} y1={yy} y2={yy - 20} stroke={C.ink} strokeWidth={1.2} />)
      els.push(<path key={`fl${i}`} d={`M${x},${yy - 20} l12,4 l-12,4z`} fill={C.yellow} stroke="#b38f00" strokeWidth={0.6} />)
    }
    if (p.change === 'down') els.push(<circle key={`p${i}`} cx={x} cy={yy} r={4.5} fill={C.coral} stroke="#fff" strokeWidth={1.5} />)
    else els.push(<circle key={`p${i}`} cx={x} cy={yy} r={3} fill="#fff" stroke={C.primaryLight} strokeWidth={1.5} />)
  })
  if (classic.length) {
    const i0 = cols.indexOf(classic[0])
    els.push(<text key="estreia" x={xAt(i0)} y={y(classic[0].position as number) + 20} textAnchor={n === 1 ? 'middle' : 'start'} fontFamily={FONT} fontSize={13} fontWeight={600} fill={C.secondaryLight}>estreia</text>)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {els}
    </svg>
  )
}

// ---------- J4 constelação ----------

type Constellation = NonNullable<PlayerStory['constellation']>

function coprimeStep(n: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  return [7, 5, 3, 2, 1].find((s) => gcd(s, n) === 1) ?? 1
}

export function ConstellationMap({ data, initials }: { data: Constellation; initials: string }) {
  const W = 358, cx = W / 2, cy = W / 2
  const col = (c: number) => (c >= 10 ? C.yellow : c <= -10 ? C.coral : C.secondary)
  const els: JSX.Element[] = []
  ;[70, 128, 166].forEach((r) => els.push(<circle key={`o${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeOpacity={0.07} />))
  const S = Math.min(data.strangers?.count ?? 0, 60)
  for (let i = 0; i < S; i++) {
    const a = (2 * Math.PI * i) / S - Math.PI / 2 + 0.05
    els.push(<circle key={`s${i}`} cx={(cx + 166 * Math.cos(a)).toFixed(1)} cy={(cy + 166 * Math.sin(a)).toFixed(1)} r={3} fill="none" stroke={C.secondaryLight} strokeOpacity={0.6} />)
  }
  const O = data.opponents.slice(0, 30)
  O.forEach((o, i) => {
    const a = (2 * Math.PI * i) / O.length - Math.PI / 2 + 0.35
    const x = cx + 128 * Math.cos(a), y = cy + 128 * Math.sin(a)
    els.push(<line key={`ol${i}`} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#fff" strokeOpacity={0.08} />)
    els.push(<circle key={`oc${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={Math.min(6, 2.2 + o.met / 5).toFixed(1)} fill="#fff" fillOpacity={0.55} />)
    if (i === 0) {
      const right = Math.cos(a) >= 0
      els.push(
        <text key="olab" x={(x + (right ? 9 : -9)).toFixed(1)} y={(y + 4).toFixed(1)} textAnchor={right ? 'start' : 'end'} fontFamily={FONT} fontSize={12} fill={C.secondaryLight}>
          {o.player.name} · só adversário
        </text>,
      )
    }
  })
  const P = data.partners
  const maxT = Math.max(1, ...P.map((p) => p.together))
  const step = coprimeStep(P.length)
  // Labelled: the rival and the carrasco, the two best and the worst chemistry.
  const ranked = P.filter((p) => p.chemistry !== 0)
  const best = [...ranked].sort((a, b) => b.chemistry - a.chemistry || a.player.id - b.player.id).filter((p) => p.chemistry >= 10).slice(0, 2)
  const worst = [...ranked].sort((a, b) => a.chemistry - b.chemistry || a.player.id - b.player.id).filter((p) => p.chemistry <= -10).slice(0, 1)
  const chemLabel = new Map([...best, ...worst].map((p) => [p.player.id, p.chemistry > 0 ? `+${p.chemistry}` : `−${-p.chemistry}`]))
  const labels: JSX.Element[] = []
  P.forEach((p, i) => {
    const a = (2 * Math.PI * ((i * step) % P.length)) / P.length - Math.PI / 2 + 0.13
    const t = p.together
    const r = 96 - 42 * (t / maxT)
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
    const rad = 3 + 6 * Math.sqrt(t / maxT)
    const id = p.player.id
    els.push(<line key={`pl${i}`} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke={col(p.chemistry)} strokeWidth={(0.6 + 3 * (t / maxT)).toFixed(1)} strokeOpacity={0.5} />)
    els.push(<circle key={`pc${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={rad.toFixed(1)} fill={col(p.chemistry)} />)
    let tag: string | null = null
    let tagColor = col(p.chemistry)
    if (id === data.rivalId) {
      els.push(<circle key={`pr${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(rad + 4).toFixed(1)} fill="none" stroke="#fff" strokeWidth={1.5} />)
      tag = 'rival'
      tagColor = C.yellow
    } else if (id === data.carrascoId) {
      els.push(<circle key={`pk${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(rad + 4).toFixed(1)} fill="none" stroke={C.coral} strokeWidth={1.5} strokeDasharray="2 2" />)
      tag = 'carrasco'
      tagColor = C.coral
    } else if (chemLabel.has(id)) {
      tag = chemLabel.get(id) as string
    }
    if (tag) {
      const lr = r + rad + 10
      const lx = cx + lr * Math.cos(a), ly = cy + lr * Math.sin(a)
      const an = Math.cos(a) > 0.25 ? 'start' : Math.cos(a) < -0.25 ? 'end' : 'middle'
      labels.push(
        <text key={`t${i}`} x={lx.toFixed(1)} y={(ly + 4).toFixed(1)} textAnchor={an} fontFamily={FONT} fontSize={13} fontWeight={700} fill="#fff">
          {p.player.name} <tspan fill={tagColor} fontWeight={600}>{tag}</tspan>
        </text>,
      )
    }
  })
  els.push(...labels)
  els.push(<circle key="me" cx={cx} cy={cy} r={15} fill={C.yellow} />)
  els.push(<text key="mt" x={cx} y={cy + 5} textAnchor="middle" fontFamily={FONT} fontSize={15} fontWeight={800} fill={C.primaryDark}>{initials}</text>)
  if (S) {
    els.push(<text key="leg" x={W - 2} y={W - 4} textAnchor="end" fontFamily={FONT} fontSize={12} fill={C.secondary}>○ inscritos que nunca defrontou</text>)
  }
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} style={{ display: 'block', margin: '2px auto 0', maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
      {els}
    </svg>
  )
}

// ---------- J6 todas as noites ----------

type Nights = NonNullable<PlayerStory['nights']>

const weekOf = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  const y = d.getFullYear()
  return { y, w: Math.floor((d.getTime() - new Date(y, 0, 1).getTime()) / 864e5 / 7) }
}

export function NightsGrid({ data }: { data: Nights }) {
  const W = 358, left = 34, cols = 53, cw = (W - left) / cols, ch = 24, gap = 10
  const by = new Map<string, Nights['cells'][number]>()
  data.cells.forEach((c) => {
    const { y, w } = weekOf(c.date)
    const k = `${y}-${w}`
    // Two nights in one week (rare): keep the played one, then the later.
    const prev = by.get(k)
    if (!prev || (c.played && !prev.played) || (c.played === prev.played && c.date > prev.date)) by.set(k, c)
  })
  const yearsSeen = data.cells.map((c) => weekOf(c.date).y)
  if (data.next?.date) yearsSeen.push(weekOf(data.next.date).y)
  const first = Math.min(...yearsSeen), last = Math.max(...yearsSeen)
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const height = 16 + years.length * (ch + gap)
  const els: JSX.Element[] = []
  ;['JAN', 'ABR', 'JUL', 'OUT'].forEach((m, i) =>
    els.push(<text key={m} x={(left + i * 13 * cw).toFixed(1)} y={9} fontFamily={FONT} fontSize={11} fontWeight={600} fill={C.secondary}>{m}</text>),
  )
  years.forEach((y, ri) => {
    const top = 16 + ri * (ch + gap)
    els.push(<text key={`y${y}`} x={0} y={top + ch / 2 + 4} fontFamily={FONT} fontSize={13} fontWeight={700} fill={C.secondaryLight}>{y}</text>)
    for (let w = 0; w < cols; w++) {
      const x = left + w * cw
      const k = by.get(`${y}-${w}`)
      const key = `${y}-${w}`
      if (!k) {
        els.push(<rect key={key} x={(x + cw / 2 - 0.7).toFixed(1)} y={top + ch / 2 - 0.7} width={1.4} height={1.4} fill="#fff" fillOpacity={0.18} />)
        continue
      }
      if (!k.played) {
        els.push(<rect key={key} x={(x + 1).toFixed(1)} y={top + 0.6} width={(cw - 2).toFixed(1)} height={ch - 1.2} rx={1.5} fill="none" stroke={C.coral} strokeWidth={0.9} />)
        continue
      }
      const net = k.net ?? 0
      const fill = net >= 6 ? C.yellow : net > 0 ? C.primaryLight : 'rgba(255,255,255,.22)'
      els.push(<rect key={key} x={(x + 0.5).toFixed(1)} y={top} width={(cw - 1).toFixed(1)} height={ch} rx={1.5} fill={fill} />)
      if (data.best && k.date === data.best.date) {
        els.push(<rect key={`${key}b`} x={(x - 1).toFixed(1)} y={top - 2} width={(cw + 2).toFixed(1)} height={ch + 4} rx={2} fill="none" stroke="#fff" strokeWidth={1.4} />)
      }
    }
  })
  if (data.next?.date) {
    const { y, w } = weekOf(data.next.date)
    const x = left + w * cw, top = 16 + years.indexOf(y) * (ch + gap)
    els.push(<rect key="next" x={(x + 1).toFixed(1)} y={top + 0.6} width={(cw - 2).toFixed(1)} height={ch - 1.2} rx={1.5} fill="none" stroke={C.yellow} strokeWidth={1.2} strokeDasharray="2 1.5" />)
    els.push(<path key="nextp" d={`M${(x + cw / 2).toFixed(1)},${top + ch + 2} v8`} stroke={C.yellow} />)
  }
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} style={{ display: 'block', margin: '2px auto 0', maxWidth: '100%', height: 'auto' }}>
      {els}
    </svg>
  )
}

// ---------- J7 assinatura: margin skyline ----------

export function Skyline({ counts }: { counts: number[] }) {
  const W = 330, bw = W / 21, H = 92
  const max = Math.max(1, ...counts)
  const els: JSX.Element[] = []
  els.push(<rect key="band" x={(8 * bw).toFixed(1)} y={0} width={(5 * bw).toFixed(1)} height={H} fill="#fff" fillOpacity={0.08} rx={3} />)
  els.push(<text key="bandt" x={(10.5 * bw).toFixed(1)} y={10} textAnchor="middle" fontFamily={FONT} fontSize={11} fontWeight={700} fill={C.yellow}>APERTADOS ±1–2</text>)
  for (let m = -10; m <= 10; m++) {
    const v = counts[m + 10] ?? 0
    const hh = (v / max) * (H - 16)
    const x = (m + 10) * bw
    els.push(<rect key={m} x={(x + 1.5).toFixed(1)} y={(H - hh).toFixed(1)} width={(bw - 3).toFixed(1)} height={hh.toFixed(1)} rx={1.5}
      fill={m > 0 ? C.yellow : m < 0 ? C.secondary : '#ffffff'} fillOpacity={m === 0 ? 0.6 : 1} />)
  }
  ;([[-10, '−10'], [-5, '−5'], [0, '0'], [5, '+5'], [10, '+10']] as const).forEach(([m, l]) =>
    els.push(<text key={`a${m}`} x={((m + 10) * bw + bw / 2).toFixed(1)} y={H + 14} textAnchor="middle" fontFamily={FONT} fontSize={12} fill={C.secondaryLight}>{l}</text>),
  )
  els.push(<text key="lo" x={0} y={H + 28} fontFamily={FONT} fontSize={11} fill={C.secondary}>perdeu por</text>)
  els.push(<text key="hi" x={W} y={H + 28} textAnchor="end" fontFamily={FONT} fontSize={11} fill={C.secondary}>ganhou por</text>)
  return (
    <svg viewBox={`0 0 ${W} 126`} width={W} height={126} style={{ display: 'block', marginTop: 10, maxWidth: '100%', height: 'auto' }}>
      {els}
    </svg>
  )
}

export function Flame({ lit }: { lit: boolean }) {
  return lit ? (
    <svg width="22" height="28" viewBox="0 0 22 28">
      <path d="M11 1c2 6 9 9 9 17a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 5 3 5-1-6 0-10 2-14z" fill={C.coral} />
      <path d="M11 14c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 2-4 4-8z" fill={C.yellow} />
    </svg>
  ) : (
    <svg width="22" height="28" viewBox="0 0 22 28">
      <path d="M11 1c2 6 9 9 9 17a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 5 3 5-1-6 0-10 2-14z" fill="none" stroke="#a0a0a0" strokeWidth={1.5} />
    </svg>
  )
}
