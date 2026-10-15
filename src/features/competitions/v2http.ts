// Shared v2 read helper for the public features (owner: S3).
// Uses the v1 axios instance so the auth header, token renewal and global loader keep working.
// With VITE_V2_MOCKS=true the typed fixtures answer before any network call, except for paths
// listed in VITE_V2_LIVE (comma-separated prefixes, e.g. "/seasons,/competitions") which hit the API.
import { api } from '@/api/client'
import { API_V2_BASE } from '@/api/v2'
import { mockGet } from './mocks'

export const USE_V2_MOCKS = import.meta.env.VITE_V2_MOCKS === 'true'
const LIVE_PREFIXES = String(import.meta.env.VITE_V2_LIVE ?? '').split(',').map((p) => p.trim()).filter(Boolean)
const isLive = (path: string) => LIVE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))

export class V2NotFound extends Error {}

export async function v2get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  if (USE_V2_MOCKS && !isLive(path)) {
    const data = mockGet(path, params)
    if (data === undefined) throw new V2NotFound(path)
    return data as T
  }
  try {
    const res = await api.get<T>(path, { baseURL: API_V2_BASE, params })
    return res.data
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) throw new V2NotFound(path)
    throw err
  }
}
