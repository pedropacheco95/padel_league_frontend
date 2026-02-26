import { api } from './client'
import { TournamentsData, TournamentDetail } from '../types'
import { USE_MOCK, mockResponse, mockTournamentsData, mockTournamentDetails } from '../data/mockData'

export const tournamentsApi = {
  list: () =>
    USE_MOCK ? mockResponse(mockTournamentsData) : api.get<TournamentsData>('/tournaments/'),
  detail: (id: number) =>
    USE_MOCK
      ? mockResponse(mockTournamentDetails[id] ?? mockTournamentDetails[51])
      : api.get<TournamentDetail>(`/tournaments/${id}`),
  removePlayerFromMatchweek: (id: number, payload: { playerId: number; matchweek: number }) =>
    USE_MOCK
      ? mockResponse({} as Record<string, never>)
      : api.post(`/tournaments/${id}/remove_player_from_matchweek`, payload),
}
