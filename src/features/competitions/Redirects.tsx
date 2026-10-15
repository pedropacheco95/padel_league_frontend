// Old URLs → v2 pages. Route wiring lives in App.tsx (owner: S0).
import { Navigate, useParams } from 'react-router-dom'
import type { Format } from '@/api/v2'
import { useCurrentCompetition } from './api'

export function RedirectToGroup() {
  const { id } = useParams()
  return <Navigate to={`/groups/${id}`} replace />
}

export function RedirectToCurrent({ format }: { format: Format }) {
  const { data, isLoading } = useCurrentCompetition(format)
  if (isLoading) return <div className="loader" />
  if (!data) return <Navigate to="/tournaments" replace />
  return <Navigate to={`/competitions/${data.id}`} replace />
}
