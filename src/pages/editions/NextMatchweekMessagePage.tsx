// Route: /edition/matchweek_message
import { useState, useEffect } from 'react'
import { mainApi } from '@/api/main'
import { tournamentsApi } from '@/api/tournaments'
import {
  buildLeagueShareMessage,
  type LeagueMatchweekData,
} from '@/lib/leagueShareMessage'
import type { Division } from '@/types'

function extractDivisionNumber(division: Division): number {
  // Division entities in this app encode their number in the name (e.g.
  // "Outono 2025 - 1ª Divisão"). Parse it; fall back to id ordering if absent.
  const match = division.name?.match(/(\d+)\s*ª\s*Divis/i)
  if (match) return parseInt(match[1], 10)
  return division.id
}

export default function NextMatchweekMessagePage() {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: indexData } = await mainApi.index()
        const lastEdition = indexData.lastEdition
        if (!lastEdition || lastEdition.divisions.length === 0) {
          if (!cancelled) {
            setError('Não foi possível carregar a edição.')
            setLoading(false)
          }
          return
        }

        const details = await Promise.all(
          lastEdition.divisions.map(division =>
            tournamentsApi.detail(division.id).then(res => ({
              division,
              detail: res.data,
            })),
          ),
        )

        const matchweekData: LeagueMatchweekData[] = []
        for (const { division, detail } of details) {
          const unplayedMatchweeks = detail.allMatches
            .filter(m => !m.played)
            .map(m => m.matchweek)
          if (unplayedMatchweeks.length === 0) continue
          const nextMatchweekNumber = Math.min(...unplayedMatchweeks)
          const matches = detail.allMatches.filter(
            m => m.matchweek === nextMatchweekNumber,
          )
          matchweekData.push({
            divisionId: division.id,
            divisionNumber: extractDivisionNumber(division),
            divisionName: division.name,
            matchweekNumber: nextMatchweekNumber,
            matches,
          })
        }

        if (cancelled) return
        setMessage(buildLeagueShareMessage(lastEdition, matchweekData))
      } catch {
        if (!cancelled) setError('Não foi possível carregar a edição.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCopy() {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content">
          <div className="c-tor-header__title">Mensagem da próxima jornada</div>
          <div className="c-tor-header__iandt">
            <span>Copia a mensagem para enviar no WhatsApp</span>
          </div>
        </div>
      </div>

      <div className="l-grid">
        <div className="c-tor-box" style={{ padding: '1.5rem' }}>
          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
              A carregar...
            </div>
          )}

          {error && !loading && (
            <div style={{ color: '#b91c1c', fontSize: '1.4rem' }}>{error}</div>
          )}

          {!loading && !error && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.8rem',
                }}
              >
                <strong style={{ color: '#111', fontSize: '1.3rem' }}>
                  Mensagem da jornada
                </strong>
                <button className="c-btn c-btn--small" onClick={handleCopy}>
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <textarea
                readOnly
                value={message}
                rows={20}
                className="form-control"
                style={{
                  width: '100%',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '1.25rem',
                  lineHeight: 1.35,
                  background: '#fff',
                  color: '#111',
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
