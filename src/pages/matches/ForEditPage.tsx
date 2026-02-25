import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { matchesApi } from '@/api/matches'
import { ForEditData } from '@/types'
import { useAuth } from '@/context/AuthContext'
import EditableMatchCard from '@/components/EditableMatchCard'

export default function ForEditPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<ForEditData | null>(null)
  const [selectedDivision, setSelectedDivision] = useState(
    searchParams.get('division_id') ?? ''
  )
  const [eliminatedByMatchweek, setEliminatedByMatchweek] = useState<Map<number, Set<number>>>(new Map())

  const fetchData = useCallback((divisionId?: string) => {
    matchesApi
      .forEdit(divisionId ? Number(divisionId) : undefined)
      .then(({ data }) => setData(data))
  }, [])

  useEffect(() => {
    fetchData(selectedDivision || undefined)
  }, [fetchData, selectedDivision])

  if (!user) return <Navigate to="/login" replace />

  function handleDivisionChange(divisionId: string) {
    setSelectedDivision(divisionId)
    setEliminatedByMatchweek(new Map())
    if (divisionId) {
      setSearchParams({ division_id: divisionId })
    } else {
      setSearchParams({})
    }
  }

  function handlePlayerEliminated(playerId: number, matchweek: number) {
    setEliminatedByMatchweek(prev => {
      const next = new Map(prev)
      const week = next.get(matchweek) ?? new Set<number>()
      next.set(matchweek, new Set([...week, playerId]))
      return next
    })
  }

  function handleSaved(divisionId: string) {
    setEliminatedByMatchweek(new Map())
    fetchData(divisionId || undefined)
  }

  return (
    <div className="l-grid">
      <div className="flex items-center justify-between mb-4 mt-4">
        {data && (
          <select
            className="form-select"
            value={selectedDivision}
            onChange={e => handleDivisionChange(e.target.value)}
          >
            <option value="">Todas as divisões</option>
            {data.divisions.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {data?.matches.length === 0 && (
        <p className="text-muted-foreground py-4">
          Não há jogos para editar{selectedDivision ? ' nesta divisão' : ''}.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {data?.matches.map(match => (
          <EditableMatchCard
            key={match.id}
            match={match}
            onSaved={() => handleSaved(selectedDivision)}
            onPlayerEliminated={handlePlayerEliminated}
            externalEliminated={[...(eliminatedByMatchweek.get(match.matchweek) ?? [])]}
          />
        ))}
      </div>
    </div>
  )
}
