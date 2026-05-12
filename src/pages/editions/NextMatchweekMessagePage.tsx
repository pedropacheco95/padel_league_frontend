// Route: /edition/matchweek_message
import { useState, useEffect } from 'react'
import { shuffleTournamentApi } from '@/api/shuffleTournament'
import { buildShuffleShareMessage } from '@/lib/shuffleShareMessage'

export default function NextMatchweekMessagePage() {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    shuffleTournamentApi
      .detail()
      .then(({ data }) => {
        setMessage(buildShuffleShareMessage(data))
      })
      .catch(() => {
        setError('Não foi possível carregar o torneio.')
      })
      .finally(() => setLoading(false))
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
