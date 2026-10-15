import type { AxiosResponse } from 'axios'
import { api } from '@/api/client'
import { API_V2_BASE, type Competition, type Stage, type StandingRow, type TeamsState } from '@/api/v2'
import { mockTeams, useMocks } from './mocks'

// Pair choice exists on both APIs with the same TeamsState shape: v1 /teams/* reads and
// writes the v2 tables already, v2 nests it under the competition. VITE_TEAMS_API=v2
// switches once /api/v2 is served; v1 ignores the competition id (it is always the current one).
const useV2 = import.meta.env.VITE_TEAMS_API === 'v2'
const v2 = { baseURL: API_V2_BASE }

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
    useMocks ? mockTeams.standings() : (await api.get(`/competitions/${competitionId}/standings`, v2)).data,

  formDivisions: async (stageId: number): Promise<Stage> =>
    useMocks
      ? mockTeams.formDivisions(stageId)
      : (await api.post(`/stages/${stageId}/divisions`, null, v2)).data,

  generateFixtures: async (competitionId: number, stageId: number, firstRoundDate?: string): Promise<Competition> =>
    useMocks
      ? mockTeams.competition(competitionId)
      : (await api.post(`/competitions/${competitionId}/fixtures`, { stageId, firstRoundDate }, v2)).data,
}
