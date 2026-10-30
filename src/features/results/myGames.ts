// "Editar jogos" (Pedro, 30 Oct): one tap takes the signed-in player to their own division in the
// competition being played, on the current jornada, with the result cards ready to edit. The pure
// choices live here; EditGamesPage does the fetching and the redirect.
import type { Competition, CompetitionCard, GroupDetail, Stage } from '@/api/v2'

export interface MyGamesTarget {
  competition: CompetitionCard
  group: GroupDetail
}

/** The stage whose games are being played: the competition's current one, else the running one, else
 * the first one not ended, else the last. */
export function currentStage(c: Competition): Stage | undefined {
  const stages = [...(c.stages ?? [])].sort((a, b) => a.number - b.number)
  return (
    stages.find(s => s.id === c.currentStageId) ??
    stages.find(s => s.status === 'running') ??
    stages.find(s => s.status !== 'ended') ??
    stages[stages.length - 1]
  )
}

/** Date of the group's current jornada (null when the group has no current round or no dates). */
export function currentRoundDate(g: GroupDetail): string | null {
  if (g.currentRound == null) return null
  return g.rounds?.find(r => r.number === g.currentRound)?.date ?? null
}

/** Where the player lands: a Clássica division has a page of its own, opened on the Jogos tab; Teams
 * and Shuffle open the competition page on the Jogos section with the division preselected. The
 * jornada is not in the URL: both pages already open on the group's current round. */
export function landingPath(t: { competition: { id: number; format: string }; group: { id: number } }): string {
  if (t.competition.format === 'classica') return `/groups/${t.group.id}?tab=matches`
  return `/competitions/${t.competition.id}?section=matches&group=${t.group.id}`
}

const DAY = 86_400_000
const daysFromToday = (date: string | null, today: Date): number => {
  if (!date) return Number.POSITIVE_INFINITY
  const t = new Date(date).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : Math.abs(t - today.getTime()) / DAY
}

/** A player in two live competitions (Clássica and Teams run in parallel): the one whose current
 * jornada is nearest today wins, because that is the one with games to type in this week. Ties and
 * missing dates go to the Clássica, then to the newest competition. */
export function pickTarget(candidates: MyGamesTarget[], today = new Date()): MyGamesTarget | null {
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => {
    const da = daysFromToday(currentRoundDate(a.group), today)
    const db = daysFromToday(currentRoundDate(b.group), today)
    if (da !== db) return da < db ? -1 : 1 // (Infinity - Infinity is NaN, so no subtraction here)
    const classica = Number(b.competition.format === 'classica') - Number(a.competition.format === 'classica')
    if (classica !== 0) return classica
    return b.competition.id - a.competition.id
  })[0]
}
