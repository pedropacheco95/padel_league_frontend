import { useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function VerifyCode() {
  const { user_id } = useParams<{ user_id: string }>()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.verifyCode(Number(user_id), Number(code))
      const playerId = res.data?.player_id
      navigate(`/players/edit/${playerId}`)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Código inválido.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.generateNewCode(Number(user_id))
    } catch {
      setError('Erro ao reenviar código.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="l-grid">
      <div className="login_container">
        <div className="inner_login_container">

          <h1>Verificar Código</h1>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                className="form-control"
                type="number"
                name="generated_code"
                placeholder="Código"
                autoFocus
                required
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'A verificar...' : 'Verificar'}
            </button>
          </form>

          <div className="forgot_password_container">
            <button
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? 'A reenviar...' : 'Reenviar Código'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
