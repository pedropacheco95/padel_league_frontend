// Torneios: every competition (Classic, Teams, Shuffle, Super Cup), grouped by season, current season first.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { CompetitionCard as Card, Format } from '@/api/v2'
import FormatBadge from '@/components/v2/FormatBadge'
import { useCompetitions } from './api'
import { FORMAT_COLOR, FORMAT_LABEL, STATUS_LABEL, dateRange, groupBySeason } from './format'

function CompetitionCard({ competition: c }: { competition: Card }) {
  const navigate = useNavigate()
  const to = `/competitions/${c.id}`
  const poster = c.coverImage?.url
  // The top strip uses the banner, else the cover (the poster column is hidden on phones), else a format-coloured band.
  const banner = c.bannerImage?.url ?? poster
  return (
    <div className="c-tournaments c-tournaments--new c-tournaments--fixed tournament__container" onClick={() => navigate(to)}>
      <div className="c-tournaments__container">
        <div className="c-tournaments__poster">
          <div
            className="c-tournaments__img c-tournaments__img--bg"
            style={poster ? { backgroundImage: `url(${poster})` } : { background: 'linear-gradient(135deg,#006A71,#48A6A7)' }}
          />
        </div>
        <div className="c-tournaments__content">
          <header className="c-tournaments__top-card">
            {banner ? (
              <div className="c-tournaments__header" style={{ backgroundImage: `url(${banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
              <div
                className="c-tournaments__header flex items-center justify-center"
                style={{ padding: 0, background: `linear-gradient(135deg, ${FORMAT_COLOR[c.format] ?? '#006A71'}, #48A6A7)` }}
              >
                <span className="text-[32px] font-bold uppercase tracking-[2px] text-white">{FORMAT_LABEL[c.format] ?? c.format}</span>
              </div>
            )}
            <div className="flex items-center gap-[8px] flex-wrap" style={{ padding: '0 0 4px' }}>
              <FormatBadge competition={c} />
              <span className="text-[12px] font-semibold" style={{ color: c.status === 'live' ? '#166534' : '#4b5563' }}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="c-tournaments__date" style={{ color: '#004E54' }}>{dateRange(c.startsOn, c.endsOn) ?? 'Datas por definir'}</p>
          </header>
          <footer className="c-tournaments__bottom-card">
            <div className="c-tournaments__header">
              <h3 className="c-tournaments__title">{c.title || c.name}</h3>
              <p className="c-tournaments__cat">
                {c.groupCount > 0 ? `${c.groupCount} ${c.groupCount === 1 ? 'grupo' : c.format === 'classica' ? 'divisões' : 'grupos'}` : ''}
                {c.groupCount > 0 && c.playerCount ? ' · ' : ''}
                {c.playerCount ? `${c.playerCount} jogadores` : ''}
              </p>
            </div>
          </footer>
          <div className="c-tournaments__triggers">
            <Link className="c-btn c-btn--secondary" to={to} onClick={(e) => e.stopPropagation()}>+ INFO</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const FILTERS: (Format | 'all')[] = ['all', 'classica', 'teams', 'shuffle', 'super_cup']

export default function CompetitionsPage() {
  const { data, isLoading, isError } = useCompetitions()
  const { user } = useAuth()
  const [format, setFormat] = useState<Format | 'all'>('all')
  const [showPast, setShowPast] = useState(false)

  const seasons = useMemo(
    () => groupBySeason((data ?? []).filter((c) => format === 'all' || c.format === format)),
    [data, format],
  )

  if (isLoading) return <div className="loader" />
  if (isError) return <p className="text-center text-[15px] py-[40px]">Não foi possível carregar os torneios.</p>

  // Default: the current season plus any season still running something (e.g. a live Shuffle filed under last season).
  const isOpen = (g: (typeof seasons)[number]) => g.isCurrent || g.competitions.some((c) => c.status !== 'ended')
  const visible = showPast ? seasons : seasons.filter((g, i) => isOpen(g) || (i === 0 && !seasons.some(isOpen)))

  return (
    <>
      {/* .l-grid adds 50px bottom padding and .c-section__title 40px margins: tightened here for the list. */}
      <div className="l-grid" style={{ paddingBottom: 0 }}>
        <div className="flex flex-wrap gap-[8px] justify-center pt-[16px] px-[16px] w-full box-border">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className="rounded-full px-[14px] min-h-[40px] text-[14px] font-semibold border"
              style={format === f ? { background: '#006A71', color: '#fff', borderColor: '#006A71' } : { background: '#fff', color: '#006A71', borderColor: '#9ACBD0' }}
            >
              {f === 'all' ? 'Todos' : FORMAT_LABEL[f]}
            </button>
          ))}
          {user?.isAdmin && (
            <Link
              to="/admin/competitions/new"
              className="inline-flex items-center rounded-full px-[14px] min-h-[40px] text-[14px] font-semibold text-white"
              style={{ background: '#92400e' }}
            >
              + Nova competição
            </Link>
          )}
        </div>
      </div>
      {visible.map((s) => (
        <section className="c-section" key={s.seasonId}>
          <div className="c-section__bg" />
          <div className="l-grid" style={{ paddingBottom: 0 }}>
            <span className="c-section__line" style={{ marginTop: 34 }} />
            <h2 className="c-section__title" style={{ marginTop: 24, marginBottom: 16 }}>Época {s.name}</h2>
          </div>
          <div className="l-grid l-grid--flex l-grid--flex-centered tournaments_grid">
            {s.competitions.map((c) => <CompetitionCard key={c.id} competition={c} />)}
          </div>
        </section>
      ))}
      {seasons.length === 0 && <p className="text-center text-[15px] py-[40px]">Sem torneios.</p>}
      {!showPast && visible.length < seasons.length && (
        <form className="show_all_tournaments_container" style={{ paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); setShowPast(true) }}>
          <button type="submit" style={{ minHeight: 40 }}>Épocas anteriores...</button>
        </form>
      )}
    </>
  )
}
