// Parelhas organised by division (Pedro, 30 Oct): TeamsState pairs carry no group, but each group's
// detail lists its members and the stage lists its groups, so the split is derived here, frontend only.
import type { GroupDetail, TeamsState } from '@/api/v2'

export type TeamsPair = TeamsState['pairs'][number]
export type DivisionGroup = Pick<GroupDetail, 'id' | 'name' | 'tier' | 'members'>
export type PairsDivision = { id: number; name: string; tier: number | null; pairs: TeamsPair[] }

const byTier = (a: DivisionGroup, b: DivisionGroup) =>
  (a.tier ?? Number.MAX_SAFE_INTEGER) - (b.tier ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'pt')

/** Divisions in tier order, each with its pairs by seed (ranking points, highest first); divisions
 * without pairs are left out. `rest`: pairs whose players are in no group (should not happen once the
 * divisions are formed; shown apart rather than lost). */
export function groupPairsByDivision(pairs: TeamsPair[], groups: DivisionGroup[]): { divisions: PairsDivision[]; rest: TeamsPair[] } {
  const groupOf = new Map<number, number>()
  for (const g of groups) for (const m of g.members ?? []) if (!groupOf.has(m.id)) groupOf.set(m.id, g.id)
  const inGroup = new Map<number, TeamsPair[]>(groups.map(g => [g.id, []]))
  const rest: TeamsPair[] = []
  for (const pair of pairs) {
    const gid = (pair.players ?? []).map(p => groupOf.get(p.id)).find(id => id != null)
    if (gid == null) rest.push(pair)
    else inGroup.get(gid)!.push(pair)
  }
  const seed = (a: TeamsPair, b: TeamsPair) => (b.rankingPoints ?? 0) - (a.rankingPoints ?? 0) || a.id - b.id
  const divisions = [...groups]
    .sort(byTier)
    .map(g => ({ id: g.id, name: g.name, tier: g.tier ?? null, pairs: inGroup.get(g.id)!.sort(seed) }))
    .filter(d => d.pairs.length > 0)
  return { divisions, rest }
}
