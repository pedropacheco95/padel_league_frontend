import type { CompetitionCard, CompetitionStatus, Format } from '@/api/v2'

export const FORMAT_LABEL: Record<Format, string> = {
  classica: 'Clássica',
  teams: 'Teams',
  shuffle: 'Shuffle',
  super_cup: 'Super Cup',
}

export const FORMAT_COLOR: Record<Format, string> = {
  classica: '#0f766e',
  teams: '#1d4ed8',
  shuffle: '#b45309',
  super_cup: '#7e22ce',
}

export const STATUS_LABEL: Record<CompetitionStatus, string> = {
  live: 'A decorrer',
  upcoming: 'Brevemente',
  ended: 'Terminado',
}

const STATUS_ORDER: Record<CompetitionStatus, number> = { live: 0, upcoming: 1, ended: 2 }

export function formatLabel(c: Pick<CompetitionCard, 'format' | 'formatLabel'>): string {
  return c.formatLabel || FORMAT_LABEL[c.format] || c.format
}

export function formatDate(d?: string | null): string {
  if (!d) return 'Não definido'
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface SeasonGroup {
  seasonId: number
  name: string
  isCurrent: boolean
  competitions: CompetitionCard[]
}

// Current season first, then newest season first. Inside a season: live, upcoming, ended, then newest start.
// "Current" comes from season.isCurrent, never from status: a fully played competition can still be this season's.
export function groupBySeason(cards: CompetitionCard[]): SeasonGroup[] {
  const bySeason = new Map<number, SeasonGroup & { start: string }>()
  for (const c of cards) {
    let g = bySeason.get(c.season.id)
    if (!g) {
      g = { seasonId: c.season.id, name: c.season.name, isCurrent: c.season.isCurrent, competitions: [], start: c.season.startsOn ?? '' }
      bySeason.set(c.season.id, g)
    }
    g.competitions.push(c)
  }
  const groups = [...bySeason.values()]
  for (const g of groups) {
    g.competitions.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (b.startsOn ?? '').localeCompare(a.startsOn ?? '') ||
        b.id - a.id,
    )
    if (!g.start) g.start = g.competitions.map((c) => c.startsOn ?? '').sort()[0] ?? ''
  }
  groups.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.start.localeCompare(a.start) || b.seasonId - a.seasonId)
  return groups.map(({ start: _start, ...g }) => g)
}
