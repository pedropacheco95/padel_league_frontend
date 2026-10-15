// Typed fixtures for the v2 write flows, used only with VITE_V2_MOCKS=true until /api/v2 is served.
// In-memory and mutable so result entry and absences round-trip within a page session.
import type { Absence, GroupDetail, Match, PlayerRef, ResultInput } from '@/api/v2'

export const useMocks = import.meta.env.VITE_V2_MOCKS === 'true'

const names = ['Ana', 'Bruno', 'Carla', 'Diogo', 'Eva', 'Filipe', 'Gil', 'Helena', 'Inês', 'João', 'Kiko', 'Luís', 'Marta', 'Nuno', 'Olga', 'Pedro']
export const mockPlayers: PlayerRef[] = names.map((name, i) => ({ id: 900 + i, name, fullName: `${name} Silva`, pictureUrl: null }))
const p = (i: number) => mockPlayers[i]

// Teams 2026/27 = competition 27; stage (mini-tournament) 1 has groups 2701, 2702 of 4 pairs each.
// Any other group id is mocked as a Shuffle group: 4 players, one round, everyone partners everyone.
const TEAMS_GROUPS = [2701, 2702]
const isTeams = (groupId: number) => TEAMS_GROUPS.includes(groupId)
const roundId = (groupId: number, round: number) => (isTeams(groupId) ? 27100 + round : groupId * 100 + round)

type Pair = [PlayerRef, PlayerRef]

function fixture(groupId: number, n: number, round: number, home: Pair, away: Pair, format: 'teams' | 'shuffle'): Match {
  return {
    id: groupId * 10 + n,
    groupId,
    competitionId: format === 'teams' ? 27 : undefined,
    format,
    round,
    scheduledAt: null,
    court: null,
    status: 'scheduled',
    participants: [
      ...home.map((player, s) => ({ side: 'home' as const, slot: (s + 1) as 1 | 2, role: 'member' as const, player })),
      ...away.map((player, s) => ({ side: 'away' as const, slot: (s + 1) as 1 | 2, role: 'member' as const, player })),
    ],
    sets: [],
    homeScore: null,
    awayScore: null,
    winner: null,
    absences: [],
  }
}

function groupMatches(groupId: number): Match[] {
  if (isTeams(groupId)) {
    const idx = TEAMS_GROUPS.indexOf(groupId)
    const pairs = [0, 1, 2, 3].map(k => [p(idx * 8 + k * 2), p(idx * 8 + k * 2 + 1)] as Pair)
    return [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]].map(([h, a], n) =>
      fixture(groupId, n, Math.floor(n / 2) + 1, pairs[h], pairs[a], 'teams'))
  }
  const four = [0, 1, 2, 3].map(k => p((groupId + k) % mockPlayers.length))
  return [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]].map(([h, a], n) =>
    fixture(groupId, n, 1, [four[h[0]], four[h[1]]], [four[a[0]], four[a[1]]], 'shuffle'))
}

const matches = new Map<number, Match>()
const seeded = new Set<number>()
function ensureGroup(groupId: number) {
  if (seeded.has(groupId)) return
  seeded.add(groupId)
  for (const m of groupMatches(groupId)) matches.set(m.id, m)
}
const absences: Absence[] = []

// An absence covers the whole round: show it on every match of that group and round.
function syncAbsences() {
  for (const [id, m] of matches) {
    const mine = absences.filter(a => a.groupId === m.groupId && a.roundId === roundId(m.groupId, m.round))
    matches.set(id, { ...m, absences: mine })
  }
}

export function mockGroup(groupId: number): GroupDetail {
  ensureGroup(groupId)
  const teams = isTeams(groupId)
  const idx = teams ? TEAMS_GROUPS.indexOf(groupId) : 0
  const rounds = (teams ? [1, 2, 3] : [1]).map(n => ({ id: roundId(groupId, n), number: n, date: null }))
  const members = [...new Map(groupMatches(groupId).flatMap(m => m.participants.map(x => [x.player!.id, x.player!]))).values()]
  return {
    id: groupId,
    name: teams ? `Divisão ${idx + 1}` : `Grupo ${groupId}`,
    tier: idx + 1,
    rating: teams ? (idx === 0 ? 500 : 250) : null,
    hasEnded: false,
    competition: teams
      ? { id: 27, name: 'Teams 2026/27', format: 'teams', season: { id: 3, name: '2026/27', isCurrent: true }, status: 'live', groupCount: 2 }
      : { id: 0, name: 'Shuffle (mock)', format: 'shuffle', season: { id: 3, name: '2026/27', isCurrent: true }, status: 'live', groupCount: 6 },
    stage: teams ? { id: 2711, number: 1, name: 'Mini-torneio 1' } : { id: 0, number: 1, name: null },
    members,
    standings: members.map((player, i) => ({ place: i + 1, player, points: 9 - i * 3, played: 3, wins: 3 - i, draws: 0, losses: i, gamesWon: 12 - i, gamesLost: 6 + i })),
    rounds,
    currentRound: 1,
  }
}

export const mockResults = {
  groupMatches: (groupId: number, round?: number): Match[] => {
    ensureGroup(groupId)
    return [...matches.values()].filter(m => m.groupId === groupId && (!round || m.round === round))
  },

  putResult: (matchId: number, input: ResultInput): Match => {
    const m = matches.get(matchId)
    if (!m) throw mockError('Jogo não encontrado.', 404)
    const sets = input.sets.map((s, i) => ({ setNo: i + 1, ...s }))
    // Teams: 3 points per set won, 1 per drawn set; otherwise the score is the games.
    const teams = m.format === 'teams'
    let home = 0
    let away = 0
    for (const s of sets) {
      const h = s.homeGames ?? 0
      const a = s.awayGames ?? 0
      if (!teams) { home += h; away += a; continue }
      if (s.outcome !== 'completed' || h === a) { home += 1; away += 1 } else if (h > a) home += 3; else away += 3
    }
    const wo = input.walkoverWinner
    const next: Match = {
      ...m,
      sets,
      status: wo ? 'walkover' : 'played',
      homeScore: wo ? null : home,
      awayScore: wo ? null : away,
      winner: wo ?? (home > away ? 'home' : away > home ? 'away' : 'draw'),
    }
    matches.set(matchId, next)
    return next
  },

  addAbsence: (roundId: number, body: { playerId: number; groupId: number; substitutePlayerId?: number | null }): Absence => {
    const player = mockPlayers.find(x => x.id === body.playerId) ?? { id: body.playerId, name: `#${body.playerId}` }
    const substitute = body.substitutePlayerId ? mockPlayers.find(x => x.id === body.substitutePlayerId) ?? null : null
    const a: Absence = { id: Date.now(), roundId, groupId: body.groupId, player, substitute, kind: 'full', source: 'recorded' }
    absences.push(a)
    syncAbsences()
    return a
  },

  deleteAbsence: (absenceId: number) => {
    const i = absences.findIndex(a => a.id === absenceId)
    if (i >= 0) absences.splice(i, 1)
    syncAbsences()
  },

  absences: (groupId: number) => absences.filter(a => a.groupId === groupId),
}

export function mockError(error: string, status = 400) {
  return Object.assign(new Error(error), { response: { status, data: { error } } })
}
