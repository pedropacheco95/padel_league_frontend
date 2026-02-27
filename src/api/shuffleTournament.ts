import { api } from './client'
import { ShuffleTournamentDetail } from '@/types/tournament'
import { ShufflePayload } from '@/types'
import { USE_MOCK, mockResponse, mockShuffleTournamentDetail } from '../data/mockData'

export const shuffleTournamentApi = {
  detail: () =>
    USE_MOCK
      ? mockResponse(mockShuffleTournamentDetail)
      : api.get<ShuffleTournamentDetail>('/shuffle_tournament'),

  calculateDivisions: (tournamentId: number) =>
    USE_MOCK
      ? mockResponse(mockShuffleTournamentDetail)
      : api.post<ShuffleTournamentDetail>('/shuffle_tournament/calculate_divisions', { tournamentId }),

  generateMatchweek: (tournamentId: number) =>
    USE_MOCK
      ? mockResponse(mockShuffleTournamentDetail)
      : api.post<ShuffleTournamentDetail>('/shuffle_tournament/generate_matchweek', { tournamentId }),

  removePlayerFromMatchweek: (payload: { tournamentId: number; playerId: string; matchweek: number }) =>
    USE_MOCK
      ? mockResponse({} as Record<string, never>)
      : api.post('/shuffle_tournament/remove_player_from_matchweek', payload),

  createShuffle: (payload: ShufflePayload) =>
    USE_MOCK
      ? mockResponse(payload as unknown as ShufflePayload)
      : api.post<ShufflePayload>(`/shuffle_tournament/create`, payload),
}
