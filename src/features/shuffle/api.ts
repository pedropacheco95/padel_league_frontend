import { api } from '@/api/client'
import { API_V2_BASE, type Competition, type StandingRow } from '@/api/v2'
import { useMocks } from '@/features/results/mocks'
import { mockShuffle } from './mocks'

const v2 = { baseURL: API_V2_BASE }

export const shuffleApi = {
  competition: async (id: number): Promise<Competition> =>
    useMocks ? mockShuffle.competition(id) : (await api.get(`/competitions/${id}`, v2)).data,

  standings: async (id: number): Promise<StandingRow[]> =>
    useMocks ? mockShuffle.standings() : (await api.get(`/competitions/${id}/standings`, v2)).data,

  // Admin: next round's groups come from the standings; only the last unplayed round can be deleted.
  generateRound: async (id: number): Promise<Competition> =>
    useMocks ? mockShuffle.addRound(id) : (await api.post(`/competitions/${id}/rounds`, null, v2)).data,

  deleteLastRound: async (id: number): Promise<Competition> =>
    useMocks ? mockShuffle.deleteRound(id) : (await api.delete(`/competitions/${id}/rounds`, v2)).data,
}
