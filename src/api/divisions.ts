import { api } from './client'

export interface DivisionPlayerPayload {
  player_id: number
  order_index: number
}

export interface CreateDivisionPayload {
  edition_id: number
  name: string
  beginning_datetime: string | null
  rating: number | null
  end_date: string | null
  has_ended: boolean
  open_division: boolean
  logo_image_id: number | null
  large_picture_id: number | null
  players: DivisionPlayerPayload[]
}

export interface ImportedDivision {
  name: string
  players: { id: number; name: string; pictureUrl?: string | null }[]
}

export interface ImportedDivisionsResponse {
  divisions: ImportedDivision[]
}

export const divisionsApi = {
  create: (payload: CreateDivisionPayload) =>
    api.post('/divisions', payload),

  update: (id: number, payload: CreateDivisionPayload) =>
    api.put(`/divisions/${id}`, payload),

  fetchLastPlayedPlayers: (editionId: number) =>
    api.get<ImportedDivisionsResponse>(`/divisions/last_played_players?edition_id=${editionId}`),
}
