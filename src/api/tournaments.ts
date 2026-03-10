import { api } from './client'
import { TournamentsData, TournamentDetail } from '../types'
import { PlayerComparisonResponse } from '@/types/tournament'
import {
  USE_MOCK,
  mockPlayerComparisonResponse,
  mockResponse,
  mockTournamentsData,
  mockTournamentDetails,
} from '../data/mockData'

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
  playerComparison: (id: number, payload: { player1Id: string; player2Id: string }) =>
    USE_MOCK
      ? mockResponse(
          mockPlayerComparisonResponse({
            tournamentId: id,
            player1Id: payload.player1Id,
            player2Id: payload.player2Id,
          }) as PlayerComparisonResponse
        )
      : api.get<PlayerComparisonResponse>(`/tournaments/${id}/player_comparison`, {
          params: payload,
        }),
}
