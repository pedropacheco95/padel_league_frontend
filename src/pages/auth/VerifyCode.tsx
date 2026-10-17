import { useState, FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '@/context/AuthContext'

export default function VerifyCode() {
  const { user_id } = useParams<{ user_id: string }>()
  const navigate = useNavigate()
  const { signInWithTokens } = useAuth()

  const [searchParams] = useSearchParams()
  // The admin's WhatsApp link carries the code (?code=12345); a fresh request says so (?requested=1).
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const requested = searchParams.get('requested') === '1'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.verifyCode(Number(user_id), Number(code))
      // The code proves who they are: sign them in so they can set a new password.
      signInWithTokens(res.data.user, res.data.access_token, res.data.refresh_token)
      navigate(`/players/edit/${res.data.player_id}?reset=1`)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Código inválido.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="l-grid">
      <div className="login_container">
        <div className="inner_login_container">

          <h1>Verificar Código</h1>

          <p style={{ color: 'black', marginBottom: 12 }}>
            {requested
              ? 'Pedido enviado! O Pedro ou a Dudas vão enviar-te o código por WhatsApp. Abre o link que te mandarem, ou escreve o código aqui.'
              : 'Escreve o código que o Pedro ou a Dudas te enviaram por WhatsApp.'}
          </p>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                className="form-control"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
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

        </div>
      </div>
    </div>
  )
}
