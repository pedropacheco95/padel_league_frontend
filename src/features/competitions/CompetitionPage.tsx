import { Link, useParams } from 'react-router-dom'
import type { Competition, GroupSummary } from '@/api/v2'
import FormatBadge from '@/components/v2/FormatBadge'
import PageHeader from '@/components/v2/PageHeader'
import { useCompetition } from './api'
import { STATUS_LABEL, dateRange } from './format'
import FormatPanel, { hasFormatPanel } from './FormatPanel'
import { V2NotFound } from './v2http'

function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="flex items-center gap-[12px] rounded-[12px] border border-gray-200 bg-white p-[12px] shadow-sm"
      style={{ color: 'inherit' }}
    >
      <div
        className="w-[56px] h-[56px] rounded-[8px] bg-cover bg-center flex-shrink-0"
        style={group.logoImage?.url ? { backgroundImage: `url(${group.logoImage.url})` } : { background: 'linear-gradient(135deg,#006A71,#48A6A7)' }}
      />
      <div className="min-w-0">
        <div className="text-[16px] font-semibold truncate">{group.name}</div>
        <div className="text-[13px] text-gray-500">
          {group.rating ? `Rating: ${group.rating}` : ''}
          {group.hasEnded ? `${group.rating ? ' · ' : ''}Terminada` : ''}
        </div>
      </div>
    </Link>
  )
}

function Header({ c }: { c: Competition }) {
  return (
    <PageHeader
      image={c.bannerImage?.url}
      kicker={<FormatBadge competition={c} />}
      title={c.label}
      subtitle={[STATUS_LABEL[c.status], dateRange(c.startsOn, c.endsOn)].filter(Boolean).join(' · ')}
    />
  )
}

export default function CompetitionPage() {
  const id = Number(useParams().id)
  const { data: c, isLoading, error } = useCompetition(id)

  if (isLoading) return <div className="loader" />
  if (error || !c) {
    return (
      <p className="text-center text-[15px] py-[40px]">
        {error instanceof V2NotFound ? 'Torneio não encontrado.' : 'Não foi possível carregar o torneio.'}{' '}
        <Link to="/tournaments" className="underline">Ver todos</Link>
      </p>
    )
  }

  if (hasFormatPanel(c.format)) {
    return (
      <div className="l-grid">
        <Header c={c} />
        <FormatPanel competition={c} />
      </div>
    )
  }

  const stages = [...c.stages].sort((a, b) => b.number - a.number)
  return (
    <div className="l-grid">
      <Header c={c} />
      {stages.map((s) => (
        <section key={s.id} className="px-[16px] py-[20px] max-w-[1000px] mx-auto w-full">
          {stages.length > 1 && <h2 className="text-[18px] font-semibold mb-[12px]">{s.name || `Fase ${s.number}`}</h2>}
          {s.groups.length === 0 ? (
            <p className="text-[15px] text-gray-500">Grupos ainda não definidos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
              {[...s.groups].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99)).map((g) => <GroupCard key={g.id} group={g} />)}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
