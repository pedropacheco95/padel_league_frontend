import { api } from '@/api/client'
import { API_V2_BASE, type Absence, type GroupDetail, type Match, type PlayerSummary, type ResultInput } from '@/api/v2'
import { mockGroup, mockPlayers, mockResults, useMocks } from './mocks'

const v2 = { baseURL: API_V2_BASE }

export interface AbsenceInput {
  playerId: number
  groupId: number
  substitutePlayerId?: number | null
  /** 'partial' = only the matches in matchIds (required then); 'full' = every match of the round */
  kind?: 'full' | 'partial'
  matchIds?: number[]
}

export interface SlotInput {
  side: 'home' | 'away'
  slot: 1 | 2
  playerId: number | null
}

export const resultsApi = {
  players: async (): Promise<PlayerSummary[]> =>
    useMocks ? mockPlayers : (await api.get('/players', v2)).data,

  group: async (groupId: number): Promise<GroupDetail> =>
    useMocks ? mockGroup(groupId) : (await api.get(`/groups/${groupId}`, v2)).data,

  groupMatches: async (groupId: number, round?: number): Promise<Match[]> =>
    useMocks
      ? mockResults.groupMatches(groupId, round)
      : (await api.get(`/groups/${groupId}/matches`, { ...v2, params: round ? { round } : undefined })).data,

  putResult: async (matchId: number, input: ResultInput): Promise<Match> =>
    useMocks ? mockResults.putResult(matchId, input) : (await api.put(`/matches/${matchId}/result`, input, v2)).data,

  addAbsence: async (roundId: number, body: AbsenceInput): Promise<Absence> =>
    useMocks
      ? mockResults.addAbsence(roundId, body)
      : (await api.post(`/rounds/${roundId}/absences`, { kind: 'full', ...body }, v2)).data,

  /** Who played in one seat: a member's seat given to someone else (null = unknown substitute) takes
   * them out of this match only; the member taken out of a seat, given back, is restored. */
  /** Undo a result saved on the wrong match: back to scheduled. */
  clearResult: async (matchId: number): Promise<Match> =>
    useMocks ? mockResults.clearResult(matchId) : (await api.delete(`/matches/${matchId}/result`, v2)).data,

  putSlot: async (matchId: number, body: SlotInput): Promise<Match> =>
    useMocks ? mockResults.putSlot(matchId, body) : (await api.put(`/matches/${matchId}/slots`, body, v2)).data,

  closeGroup: async (groupId: number): Promise<GroupDetail> =>
    useMocks ? { ...mockGroup(groupId), hasEnded: true } : (await api.post(`/groups/${groupId}/close`, null, v2)).data,

  deleteAbsence: async (absenceId: number): Promise<void> => {
    if (useMocks) return mockResults.deleteAbsence(absenceId)
    await api.delete(`/absences/${absenceId}`, v2)
  },
}

export function errorMessage(err: unknown, fallback = 'Não foi possível guardar. Tenta outra vez.') {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}
