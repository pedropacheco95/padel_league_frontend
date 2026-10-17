import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.forgotPassword(username)
      const userId = res.data?.user_id
      navigate(`/verify-code/${userId}?requested=1`)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Erro ao pedir o código.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="l-grid">
      <div className="login_container">
        <div className="inner_login_container">
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <p style={{ color: 'black', marginBottom: 12 }}>
            Escreve o teu username e pede um código. O Pedro ou a Dudas enviam-to por WhatsApp.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                className="form-control"
                type="text"
                name="username"
                placeholder="Username"
                autoComplete="off"
                autoFocus
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'A pedir...' : 'Pedir código'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
