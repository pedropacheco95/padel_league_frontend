import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Erro ao fazer login.'
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

            <div className="form-group">
              <input
                className="form-control"
                type="password"
                name="password"
                placeholder="Password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'A entrar...' : 'Login'}
            </button>
          </form>

          <div className="forgot_password_container">
            <Link to="/forgot-password">Esqueci-me da minha password</Link>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Login;