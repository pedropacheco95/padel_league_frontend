import { useQuery } from '@tanstack/react-query'
import type { GroupDetail, Match } from '@/api/v2'
import { v2get } from '@/features/competitions/v2http'

export const groupsApi = {
  get: (id: number) => v2get<GroupDetail>(`/groups/${id}`),
  matches: (id: number, round?: number) => v2get<Match[]>(`/groups/${id}/matches`, round ? { round } : undefined),
}

export const useGroup = (id: number) =>
  useQuery({ queryKey: ['v2', 'group', id], queryFn: () => groupsApi.get(id), enabled: Number.isFinite(id) })

export const useGroupMatches = (id: number) =>
  useQuery({ queryKey: ['v2', 'group', id, 'matches'], queryFn: () => groupsApi.matches(id), enabled: Number.isFinite(id) })
