// Typed fixtures for the v2 public pages, used only when VITE_V2_MOCKS=true.
// `satisfies` makes tsc check every fixture against the generated contract types.
import type {
  CompetitionCard,
  Competition,
  GroupDetail,
  Match,
  Participant,
  PlayerComparison,
  PlayerDetail,
  PlayerRef,
  PlayerSummary,
  Ranking,
  RankingExplanation,
  Season,
  StandingRow,
} from '@/api/v2'

const pic = '/static/images/Player/default_player.jpg'

export const seasons = [
  { id: 2, name: '2026/27', startsOn: '2026-09-01', endsOn: '2027-07-31', isCurrent: true },
  { id: 1, name: '2025/26', startsOn: '2025-09-01', endsOn: '2026-07-31', isCurrent: false },
] satisfies Season[]

const NAMES = ['Diogo Leão', 'Pedro Pacheco', 'Dinis', 'Bucas', 'João Bello', 'Zé Pedro Graça', 'Miguel', 'Tomás']
export const players: PlayerRef[] = NAMES.map((name, i) => ({ id: i + 1, name, fullName: name, pictureUrl: pic }))

export const competitions = [
  {
    id: 27, name: 'Teams 2026/27', title: 'Teams', format: 'teams', formatLabel: 'Teams', season: seasons[0],
    status: 'live', startsOn: '2026-10-19', endsOn: '2026-12-14', groupCount: 0, playerCount: 32,
    coverImage: null, bannerImage: null, legacyEditionId: null,
  },
  {
    id: 26, name: 'Shuffle Outubro', format: 'shuffle', formatLabel: 'Shuffle', season: seasons[0],
    status: 'upcoming', startsOn: '2026-10-25', endsOn: '2026-10-25', groupCount: 3, playerCount: 12,
    coverImage: null, bannerImage: null,
  },
  {
    id: 25, name: 'Clássica I 2026/27', title: 'Clássica I', format: 'classica', formatLabel: 'Clássica', season: seasons[0],
    status: 'ended', startsOn: '2026-09-08', endsOn: '2026-10-13', groupCount: 9, playerCount: 72,
    coverImage: null, bannerImage: null, legacyEditionId: 24,
  },
  {
    id: 20, name: 'Super Cup 2025/26', format: 'super_cup', formatLabel: 'Super Cup', season: seasons[1],
    status: 'ended', startsOn: '2026-06-20', endsOn: '2026-06-21', groupCount: 1, playerCount: 8,
    coverImage: null, bannerImage: null,
  },
  {
    id: 19, name: 'Clássica III 2025/26', format: 'classica', formatLabel: 'Clássica', season: seasons[1],
    status: 'ended', startsOn: '2026-03-02', endsOn: '2026-05-25', groupCount: 9, playerCount: 72,
    coverImage: null, bannerImage: null, legacyEditionId: 22,
  },
] satisfies CompetitionCard[]

const rounds = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: 900 + n, number: n, date: new Date(Date.UTC(2026, 8, 7 + n * 5)).toISOString().slice(0, 10) }))

export const competitionDetails: Record<number, Competition> = {
  25: {
    ...competitions[2],
    rules: { pointsWin: 3, pointsDraw: 1 },
    currentStageId: 250,
    stages: [{
      id: 250, number: 1, name: null, status: 'ended', emitsAward: true, rounds,
      groups: [1, 2, 3].map((t) => ({ id: 80 + t, name: `Divisão ${t}`, tier: t, rating: 1500 - t * 100, hasEnded: true, logoImage: null, bannerImage: null })),
    }],
  },
  27: {
    ...competitions[0],
    rules: {},
    currentStageId: 270,
    stages: [{ id: 270, number: 1, name: 'Mini-torneio 1', status: 'planned', emitsAward: true, pairingDeadline: '2026-10-18T22:00:00Z', pairingClosed: false, groups: [], rounds: [] }],
  },
  26: {
    ...competitions[1],
    rules: {},
    currentStageId: 260,
    stages: [{ id: 260, number: 1, status: 'planned', groups: [], rounds: [] }],
  },
}

function side(home: number[], away: number[]): Participant[] {
  return [
    ...home.map((p, i) => ({ side: 'home' as const, slot: (i + 1) as 1 | 2, role: 'member' as const, player: players[p] })),
    ...away.map((p, i) => ({ side: 'away' as const, slot: (i + 1) as 1 | 2, role: 'member' as const, player: players[p] })),
  ]
}

export const groupMatches = [
  { id: 5001, groupId: 81, groupName: 'Divisão 1', competitionId: 25, format: 'classica', round: 1, scheduledAt: '2026-09-12T20:00:00Z', court: 'Campo 1', status: 'played', participants: side([0, 1], [2, 3]), sets: [{ setNo: 1, homeGames: 6, awayGames: 4, outcome: 'completed' }], homeScore: 6, awayScore: 4, winner: 'home', absences: [] },
  { id: 5002, groupId: 81, groupName: 'Divisão 1', competitionId: 25, format: 'classica', round: 1, scheduledAt: '2026-09-12T20:00:00Z', court: 'Campo 2', status: 'played', participants: side([4, 5], [6, 7]), sets: [{ setNo: 1, homeGames: 5, awayGames: 5, outcome: 'completed' }], homeScore: 5, awayScore: 5, winner: 'draw', absences: [] },
  { id: 5003, groupId: 81, groupName: 'Divisão 1', competitionId: 25, format: 'classica', round: 2, scheduledAt: '2026-09-17T21:00:00Z', court: 'Campo 1', status: 'played', participants: side([0, 2], [1, 3]), sets: [{ setNo: 1, homeGames: 3, awayGames: 7, outcome: 'completed' }], homeScore: 3, awayScore: 7, winner: 'away', absences: [] },
  { id: 5004, groupId: 81, groupName: 'Divisão 1', competitionId: 25, format: 'classica', round: 7, scheduledAt: '2026-10-22T21:00:00Z', court: null, status: 'scheduled', participants: side([0, 4], [1, 5]), sets: [], homeScore: null, awayScore: null, winner: null, absences: [] },
] satisfies Match[]

const standings: StandingRow[] = players.map((p, i) => ({
  place: i + 1, player: p, points: 40 - i * 4, played: 21 - (i % 3), wins: 12 - i, draws: 2, losses: 7 + i - (i % 3),
  gamesWon: 110 - i * 6, gamesLost: 80 + i * 4, attendancePct: 100 - (i % 3) * 5, rankingPlacePoints: 200 - i * 20, rankingBonusPoints: 0,
}))

export const groupDetails: Record<number, GroupDetail> = Object.fromEntries(
  competitionDetails[25].stages[0].groups.map((g) => [g.id, {
    ...g,
    competition: competitions[2],
    stage: { id: 250, number: 1, name: null },
    members: players,
    standings,
    standingsFrozen: true,
    rounds,
    currentRound: 7,
    lastPlayedMatches: groupMatches.filter((m) => m.status === 'played' && m.groupId === g.id),
  } satisfies GroupDetail]),
)

export const playerSummaries: PlayerSummary[] = players.map((p, i) => ({ ...p, rankingPosition: i + 1, rankingPoints: 900.5 - i * 73.25, status: 'active' }))

export const playerDetail = (id: number): PlayerDetail | undefined => {
  const s = playerSummaries.find((p) => p.id === id)
  if (!s) return undefined
  return {
    ...s, largePictureUrl: pic, preferredHand: 'Direita', preferredPosition: 'Esquerda', height: 180, birthDate: '1995-04-02',
    history: [
      { competition: competitions[2], groupId: 81, groupName: 'Divisão 1', place: id, points: 40 - id * 4, played: 21, wins: 12, draws: 2, losses: 7, awardPoints: 200 - id * 20 },
      { competition: competitions[4], groupId: 71, groupName: 'Divisão 2', place: 2, points: 35, played: 21, wins: 10, draws: 3, losses: 8, awardPoints: 150 },
    ],
    stats: { matchesPlayed: 42, matchesWon: 22, matchesDrawn: 5, matchesLost: 15, gamesWon: 230, gamesLost: 190, titles: 1 },
  }
}

export const ranking = {
  snapshotId: 12, rule: { key: 'last3_plus_current', name: 'Últimas 3 + atual' }, computedAt: '2026-10-14T09:00:00Z',
  entries: playerSummaries.map((p, i) => ({ position: i + 1, player: p, points: p.rankingPoints ?? 0, previousPosition: i === 0 ? 2 : i === 1 ? 1 : i + 1 })),
} satisfies Ranking

export const rankingExplanation = (id: number): RankingExplanation => ({
  player: players[id - 1],
  total: playerSummaries[id - 1]?.rankingPoints ?? 0,
  lines: [
    { competition: competitions[2], stageNumber: 1, place: id, placePoints: 200 - id * 20, bonusPoints: 10, counted: true, reason: 'Competição atual' },
    { competition: competitions[4], stageNumber: 1, place: 2, placePoints: 150, bonusPoints: 0, counted: true },
    { competition: competitions[3], stageNumber: 1, place: 5, placePoints: 40.25, bonusPoints: 0, counted: false, reason: 'Fora das últimas 3' },
  ],
})

export const comparison = (a: number, b: number): PlayerComparison => ({
  a: playerSummaries[a - 1], b: playerSummaries[b - 1],
  headToHead: { played: 4, aWins: 2, bWins: 1, draws: 1 },
  together: { played: 3, wins: 2, draws: 0, losses: 1 },
  matches: groupMatches.slice(0, 2),
})

function num(v: unknown): number | undefined {
  return v === undefined || v === null || v === '' ? undefined : Number(v)
}

export function mockGet(path: string, params?: Record<string, unknown>): unknown {
  let m: RegExpMatchArray | null
  if (path === '/seasons') return seasons
  if (path === '/competitions') {
    return competitions.filter(
      (c) => (!num(params?.season) || c.season.id === num(params?.season)) && (!params?.format || c.format === params.format),
    )
  }
  if (path === '/competitions/current') {
    return competitions.find((c) => c.format === params?.format && c.season.isCurrent && c.status !== 'ended')
      ?? competitions.find((c) => c.format === params?.format)
  }
  if ((m = path.match(/^\/competitions\/(\d+)$/))) return competitionDetails[+m[1]] ?? undefined
  // Any group id answers (live competitions link to real ids): reuse the fixture under the requested id.
  if ((m = path.match(/^\/groups\/(\d+)$/))) {
    const id = +m[1]
    const base = groupDetails[id] ?? groupDetails[81]
    return { ...base, id, name: groupDetails[id] ? base.name : `Grupo ${id} (mock)`, lastPlayedMatches: base.lastPlayedMatches?.map((x) => ({ ...x, groupId: id })) }
  }
  if ((m = path.match(/^\/groups\/(\d+)\/matches$/))) {
    const round = num(params?.round)
    return groupMatches.filter((x) => !round || x.round === round).map((x) => ({ ...x, groupId: +m![1] }))
  }
  if (path === '/calendar') return groupMatches
  if (path === '/players') return playerSummaries
  if (path === '/players/compare') return comparison(num(params?.a) ?? 1, num(params?.b) ?? 2)
  if ((m = path.match(/^\/players\/(\d+)$/))) return playerDetail(+m[1])
  if ((m = path.match(/^\/players\/(\d+)\/matches$/))) return groupMatches.filter((x) => x.participants.some((p) => p.player?.id === +m![1]))
  if (path === '/rankings/current') return ranking
  if ((m = path.match(/^\/rankings\/players\/(\d+)$/))) return rankingExplanation(+m[1])
  return undefined
}
