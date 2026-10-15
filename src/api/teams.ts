import { api } from '@/api/client'
import { TeamsState } from '../types'

export const teamsApi = {
  state: () => api.get<TeamsState>('/teams/'),

  choosePartner: (partnerId: number) =>
    api.post<TeamsState>('/teams/partner', { partnerId }),

  withdraw: () => api.delete<TeamsState>('/teams/partner'),

  // Admin
  setPair: (playerIds: [number, number]) =>
    api.post<TeamsState>('/teams/pairs', { playerIds }),

  unpair: (pairId: number) => api.delete<TeamsState>(`/teams/pairs/${pairId}`),

  closePairing: () => api.post<TeamsState>('/teams/close_pairing'),

  addToRoster: (playerId: number) => api.post<TeamsState>(`/teams/roster/${playerId}`),

  removeFromRoster: (playerId: number) => api.delete<TeamsState>(`/teams/roster/${playerId}`),
}
