import { api } from '@/api/client'
import { PlayerRanking, PlayerDetail } from '../types'
import { USE_MOCK, mockResponse, mockPlayersRanking, mockPlayerDetails } from '../data/mockData'

export const playersApi = {
  ranking: () =>
    USE_MOCK
      ? mockResponse(mockPlayersRanking)
      : api.get<PlayerRanking[]>('/players/ranking'),

  detail: (id: number) =>
    USE_MOCK
      ? mockResponse(mockPlayerDetails[id] ?? mockPlayerDetails[7])
      : api.get<PlayerDetail>(`/players/${id}`),
}
