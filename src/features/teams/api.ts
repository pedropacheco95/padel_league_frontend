import type { AxiosResponse } from 'axios'
import { api } from '@/api/client'
import { API_V2_BASE, type Competition, type Stage, type StandingRow, type TeamsState } from '@/api/v2'
import { mockTeams, useMocks } from './mocks'
import { MOCK_ME, mockProjection, mockSimulation, type TeamsProjection, type TeamsSimulation } from './projection'

// Pair choice exists on both APIs with the same TeamsState shape: v1 /teams/* reads and
// writes the v2 tables already, v2 nests it under the competition. VITE_TEAMS_API=v2
// is the default (launch runs on /api/v2); VITE_TEAMS_API=v1 falls back. v1 ignores the competition id (it is always the current one).
const useV2 = import.meta.env.VITE_TEAMS_API !== 'v1'
const v2 = { baseURL: API_V2_BASE }

// Not served yet / nothing ranked yet: show the empty state, not an error.
const emptyOn404 = (err: { response?: { status?: number } }) => {
  if (err?.response?.status === 404) return []
  throw err
}

type Res<T> = Promise<AxiosResponse<T>>

export const teamsApi = {
  state: (competitionId: number): Res<TeamsState> =>
    useV2 ? api.get(`/competitions/${competitionId}/teams`, v2) : api.get('/teams/'),

  choosePartner: (competitionId: number, partnerId: number): Res<TeamsState> =>
    useV2
      ? api.post(`/competitions/${competitionId}/partner-requests`, { partnerId }, v2)
      : api.post('/teams/partner', { partnerId }),

  withdraw: (competitionId: number): Res<TeamsState> =>
    useV2 ? api.delete(`/competitions/${competitionId}/partner-requests`, v2) : api.delete('/teams/partner'),

  // Admin
  setPair: (competitionId: number, playerIds: [number, number]): Res<TeamsState> =>
    useV2
      ? api.post(`/competitions/${competitionId}/pairs`, { playerIds }, v2)
      : api.post('/teams/pairs', { playerIds }),

  unpair: (competitionId: number, pairId: number): Res<TeamsState> =>
    useV2 ? api.delete(`/competitions/${competitionId}/pairs/${pairId}`, v2) : api.delete(`/teams/pairs/${pairId}`),

  closePairing: (competitionId: number): Res<TeamsState> =>
    useV2 ? api.post(`/competitions/${competitionId}/pairs/close`, null, v2) : api.post('/teams/close_pairing'),

  addToRoster: (competitionId: number, playerId: number): Res<TeamsState> =>
    useV2
      ? api.post(`/competitions/${competitionId}/roster/${playerId}`, null, v2)
      : api.post(`/teams/roster/${playerId}`),

  removeFromRoster: (competitionId: number, playerId: number): Res<TeamsState> =>
    useV2
      ? api.delete(`/competitions/${competitionId}/roster/${playerId}`, v2)
      : api.delete(`/teams/roster/${playerId}`),
}

// v2 only (no v1 equivalent); fixtures behind VITE_V2_MOCKS=true until S2 serves them.
export const teamsV2Api = {
  competition: async (competitionId: number): Promise<Competition> =>
    useMocks ? mockTeams.competition(competitionId) : (await api.get(`/competitions/${competitionId}`, v2)).data,

  standings: async (competitionId: number): Promise<StandingRow[]> =>
    useMocks ? mockTeams.standings() : await api.get(`/competitions/${competitionId}/standings`, v2).then(r => r.data, emptyOn404),

  formDivisions: async (stageId: number): Promise<Stage> =>
    useMocks
      ? mockTeams.formDivisions(stageId)
      : (await api.post(`/stages/${stageId}/divisions`, null, v2)).data,

  // Live divisions while pairs form: mutual pairs as they are, the rest paired by ranking.
  projection: async (competitionId: number): Promise<TeamsProjection> =>
    useMocks ? mockProjection() : (await api.get(`/competitions/${competitionId}/teams/projection`, v2)).data,

  // Where `player` would play with `partner` (null: no declaration, paired by ranking). Read-only.
  simulate: async (competitionId: number, player: number | null, partner: number | null): Promise<TeamsSimulation> =>
    useMocks
      ? mockSimulation(player ?? MOCK_ME, partner)
      : (await api.get(`/competitions/${competitionId}/teams/simulate`, {
          ...v2,
          params: { ...(player ? { player } : {}), ...(partner ? { partner } : {}) },
        })).data,
}
