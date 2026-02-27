import { api } from '@/api/client'
import { PlayerRanking, PlayerDetail, PlayerShort } from '../types'
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

  short: (id: number) =>
    USE_MOCK
      ? mockResponse(mockPlayerDetails[id] ?? mockPlayerDetails[7])
      : api.get<PlayerShort>(`/players/${id}`),
  
  players_short: () =>
    USE_MOCK
      ? mockResponse(mockPlayerDetails)
      : api.get<[PlayerShort]>(`/players/short/all`),
}
