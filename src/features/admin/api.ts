import { api } from '@/api/client'
import { API_V2_BASE, type Competition, type CompetitionCard, type Format, type Schemas, type Season } from '@/api/v2'
import { useMocks } from '@/features/results/mocks'
import { mockTeams } from '@/features/teams/mocks'

const v2 = { baseURL: API_V2_BASE }

export type CompetitionCreate = Schemas['CompetitionCreate']

export const adminApi = {
  seasons: async (): Promise<Season[]> => (await api.get('/seasons', v2)).data,

  competitions: async (format: Format): Promise<CompetitionCard[]> =>
    (await api.get('/competitions', { ...v2, params: { format } })).data,

  create: async (body: CompetitionCreate): Promise<Competition> =>
    useMocks
      ? { ...mockTeams.competition(9999), name: body.name, format: body.format, stages: [] }
      : (await api.post('/competitions', body, v2)).data,
}
