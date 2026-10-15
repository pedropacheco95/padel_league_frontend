import { useQuery } from '@tanstack/react-query'
import type { Competition, CompetitionCard, Format, Season } from '@/api/v2'
import { v2get } from './v2http'

export const competitionsApi = {
  seasons: () => v2get<Season[]>('/seasons'),
  list: (params?: { season?: number; format?: Format }) => v2get<CompetitionCard[]>('/competitions', params),
  current: (format: Format) => v2get<CompetitionCard>('/competitions/current', { format }),
  get: (id: number) => v2get<Competition>(`/competitions/${id}`),
}

export const useCompetitions = (params?: { season?: number; format?: Format }) =>
  useQuery({ queryKey: ['v2', 'competitions', params ?? {}], queryFn: () => competitionsApi.list(params) })

export const useCurrentCompetition = (format: Format) =>
  useQuery({ queryKey: ['v2', 'competitions', 'current', format], queryFn: () => competitionsApi.current(format), retry: false })

export const useCompetition = (id: number) =>
  useQuery({ queryKey: ['v2', 'competition', id], queryFn: () => competitionsApi.get(id), enabled: Number.isFinite(id) })
