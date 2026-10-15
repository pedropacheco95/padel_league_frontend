// Typed fixtures for the v2 write flows, used only with VITE_V2_MOCKS=true until /api/v2 is served.
// In-memory and mutable so result entry and absences round-trip within a page session.
import type { Absence, GroupDetail, Match, PlayerRef, ResultInput } from '@/api/v2'

export const useMocks = import.meta.env.VITE_V2_MOCKS === 'true'

const names = ['Ana', 'Bruno', 'Carla', 'Diogo', 'Eva', 'Filipe', 'Gil', 'Helena', 'Inês', 'João', 'Kiko', 'Luís', 'Marta', 'Nuno', 'Olga', 'Pedro']
export const mockPlayers: PlayerRef[] = names.map((name, i) => ({ id: 900 + i, name, fullName: `${name} Silva`, pictureUrl: null }))
const p = (i: number) => mockPlayers[i]

// Teams 2026/27 = competition 27; stage (mini-tournament) 1 has groups 2701, 2702 of 4 pairs each.
const pairsOf = (groupIdx: number) => [0, 1, 2, 3].map(k => [p(groupIdx * 8 + k * 2), p(groupIdx * 8 + k * 2 + 1)])

function teamsMatches(groupId: number, groupIdx: number): Match[] {
  const pairs = pairsOf(groupIdx)
  const fixtures = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
  return fixtures.map(([h, a], n) => ({
    id: groupId * 10 + n,
    groupId,
    groupName: `Divisão ${groupIdx + 1}`,
    competitionId: 27,
    format: 'teams',
    round: Math.floor(n / 2) + 1,
    scheduledAt: null,
    court: null,
    status: 'scheduled',
    participants: [
      ...pairs[h].map((player, s) => ({ side: 'home' as const, slot: (s + 1) as 1 | 2, role: 'member' as const, player })),
      ...pairs[a].map((player, s) => ({ side: 'away' as const, slot: (s + 1) as 1 | 2, role: 'member' as const, player })),
    ],
    sets: [],
    homeScore: null,
    awayScore: null,
    winner: null,
    absences: [],
  }))
}

const matches = new Map<number, Match>(
  [...teamsMatches(2701, 0), ...teamsMatches(2702, 1)].map(m => [m.id, m]),
)
const absences: Absence[] = []

// An absence covers the whole round: show it on every match of that group and round.
function syncAbsences() {
  for (const [id, m] of matches) {
    const mine = absences.filter(a => a.groupId === m.groupId && a.roundId === 27100 + m.round)
    matches.set(id, { ...m, absences: mine })
  }
}

const rounds = [1, 2, 3].map(n => ({ id: 27100 + n, number: n, date: null }))

export function mockGroup(groupId: number): GroupDetail {
  const idx = groupId === 2702 ? 1 : 0
  return {
    id: groupId,
    name: `Divisão ${idx + 1}`,
    tier: idx + 1,
    rating: idx === 0 ? 500 : 250,
    hasEnded: false,
    competition: { id: 27, name: 'Teams 2026/27', format: 'teams', season: { id: 3, name: '2026/27', isCurrent: true }, status: 'live', groupCount: 2 },
    stage: { id: 2711, number: 1, name: 'Mini-torneio 1' },
    members: mockPlayers.slice(idx * 8, idx * 8 + 8),
    standings: [],
    rounds,
    currentRound: 1,
  }
}

export const mockResults = {
  groupMatches: (groupId: number, round?: number): Match[] =>
    [...matches.values()].filter(m => m.groupId === groupId && (!round || m.round === round)),

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
