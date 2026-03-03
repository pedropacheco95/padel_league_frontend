import { api } from './client'
import type { AxiosRequestConfig } from 'axios'
import { PlayerComparisonResponse, ShuffleTournamentDetail } from '@/types/tournament'
import { ShufflePayload } from '@/types'
import {
  USE_MOCK,
  mockPlayerComparisonResponse,
  mockResponse,
  mockShuffleTournamentDetail,
} from '../data/mockData'

export const shuffleTournamentApi = {
  detail: (options?: { skipGlobalLoader?: boolean; trackGlobalLoader?: boolean }) =>
    USE_MOCK
      ? mockResponse(mockShuffleTournamentDetail)
      : api.get<ShuffleTournamentDetail>('/shuffle_tournament', options as AxiosRequestConfig),

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

  playerComparison: (payload: { tournamentId: number; player1Id: string; player2Id: string }) =>
    USE_MOCK
      ? mockResponse(mockPlayerComparisonResponse(payload) as PlayerComparisonResponse)
      : api.get<PlayerComparisonResponse>('/shuffle_tournament/player_comparison', {
          params: payload,
        }),
}
