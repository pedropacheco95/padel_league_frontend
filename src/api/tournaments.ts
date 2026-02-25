import { api } from './client'
import { TournamentsData, TournamentDetail } from '../types'

export const tournamentsApi = {
  list: () => api.get<TournamentsData>('/tournaments/'),
  detail: (id: number) => api.get<TournamentDetail>(`/tournaments/${id}`),
}
