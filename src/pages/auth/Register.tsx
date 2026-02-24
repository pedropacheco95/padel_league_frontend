import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import PlayerPictureInput from '@/components/auth/PlayerPictureInput'

export default function Register() {
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pictureFile, setPictureFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    full_name: '',
    prefered_hand: 'Direita',
    prefered_position: 'Tanto faz',
    height: '',
    birth_date: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val) payload.append(key, val)
      })
      if (pictureFile) payload.append('finalFile', pictureFile)

      await authApi.register(payload as any)
      navigate('/')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Erro ao registar.'
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
            <div className="alert alert-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} encType="multipart/form-data">

            {/* ── Account fields ── */}
            <div className="form-group">
              <input
                className="form-control"
                type="text"
                name="username"
                placeholder="Username"
                autoComplete="off"
                autoFocus
                required
                value={form.username}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="form-control"
                type="email"
                name="email"
                placeholder="example@example.com"
                autoComplete="off"
                required
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="form-control"
                type="password"
                name="password"
                placeholder="Password"
                required
                value={form.password}
                onChange={handleChange}
              />
            </div>

            {/* ── Player data ── */}
            <label style={{ color: 'black', fontWeight: 'bold' }}>
              Dados de jogador
            </label>

            <section id="player_data">
              <div className="form-group optional">
                <label htmlFor="name" style={{ color: 'black' }}>Nome (Curto)</label>
                <input
                  className="form-control"
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nome em forma curta"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group optional">
                <label htmlFor="full_name" style={{ color: 'black' }}>Nome e apelido</label>
                <input
                  className="form-control"
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Nome e apelido"
                  value={form.full_name}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section id="player_data_2">
              <div className="form-group optional">
                <label htmlFor="prefered_hand" style={{ color: 'black' }}>Mão preferida</label>
                <select
                  className="form-control"
                  id="prefered_hand"
                  name="prefered_hand"
                  value={form.prefered_hand}
                  onChange={handleChange}
                >
                  <option value="Direita">Direita</option>
                  <option value="Esquerda">Esquerda</option>
                </select>
              </div>

              <div className="form-group optional">
                <label htmlFor="height" style={{ color: 'black' }}>Altura</label>
                <input
                  className="form-control"
                  id="height"
                  name="height"
                  type="number"
                  step="0.01"
                  placeholder="1.75"
                  value={form.height}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section>
              <div className="form-group optional">
                <label htmlFor="prefered_position" style={{ color: 'black' }}>Posição preferida</label>
                <select
                  className="form-control"
                  id="prefered_position"
                  name="prefered_position"
                  value={form.prefered_position}
                  onChange={handleChange}
                >
                  <option value="Tanto faz">Tanto faz</option>
                  <option value="Lado direito">Lado direito</option>
                  <option value="Lado esquerdo">Lado esquerdo</option>
                </select>
              </div>

              <div className="form-group optional">
                <label htmlFor="birth_date" style={{ color: 'black' }}>Data de nascimento</label>
                <input
                  className="form-control"
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={handleChange}
                />
              </div>
            </section>

            {/* ── Player picture ── */}
            <div className="form-group">
              <label style={{ color: 'black', fontWeight: 'bold' }}>
                Fotografia de jogador
              </label>
              <PlayerPictureInput onChange={file => setPictureFile(file)} />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'A registar...' : 'Registar'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
