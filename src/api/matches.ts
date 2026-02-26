import { api } from '@/api/client'
import { Match, EditMatchPayload, ForEditData } from '../types'
import { USE_MOCK, mockResponse, mockForEditData } from '../data/mockData'

export const matchesApi = {
  editMatch: (id: number, payload: EditMatchPayload) =>
    USE_MOCK
      ? mockResponse(payload as unknown as Match)
      : api.post<Match>(`/matches/${id}/edit`, payload),

  editShuffleMatch: (id: string, payload: { homeGames: number; awayGames: number }) =>
    USE_MOCK
      ? mockResponse({} as Record<string, never>)
      : api.post(`/matches/${id}/edit_shuffle`, payload),

  forEdit: (divisionId?: number) =>
    USE_MOCK
      ? mockResponse(mockForEditData)
      : api.get<ForEditData>(`/matches/for_edit${divisionId ? `?division_id=${divisionId}` : ''}`),
}
