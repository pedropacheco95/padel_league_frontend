import { api } from './client'
import { ShuffleTournamentDetail } from '@/types/tournament'
import { USE_MOCK, mockResponse, mockShuffleTournamentDetail } from '../data/mockData'

export const shuffleTournamentApi = {
  detail: () =>
    USE_MOCK
      ? mockResponse(mockShuffleTournamentDetail)
      : api.get<ShuffleTournamentDetail>('/shuffle_tournament'),
  removePlayerFromMatchweek: (payload: { playerId: string; matchweek: number }) =>
    USE_MOCK
      ? mockResponse({} as Record<string, never>)
      : api.post('/shuffle_tournament/remove_player_from_matchweek', payload),
}
