import { useState, useEffect, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { playersApi } from '../../api/players'
import { useAuth } from '@/context/AuthContext'
import PlayerPictureInput from '@/components/auth/PlayerPictureInput'

// The API only sends a birthday as a full ISO timestamp; <input type="date"> wants YYYY-MM-DD.
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

export default function EditPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const playerId = Number(id)
  const navigate = useNavigate()
  const { user, loading: authLoading, setUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [pictureUrl, setPictureUrl] = useState<string | undefined>(undefined)

  const [form, setForm] = useState({
    username: '',
    email: '',
    current_password: '',
    password: '',
    name: '',
    full_name: '',
    prefered_hand: 'Direita',
    prefered_position: 'Tanto faz',
    height: '',
    birth_date: '',
  })

  const isSelf = user?.playerId === playerId
  const canEdit = !!user && (isSelf || user.isAdmin)

  useEffect(() => {
    if (authLoading || !canEdit || !id) return
    playersApi.detail(playerId)
      .then(res => {
        const p = res.data
        setForm(prev => ({
          ...prev,
          // Account fields only exist on the logged-in user, so an admin editing
          // someone else starts blank — and blank means "leave unchanged".
          username: isSelf ? user?.username ?? '' : '',
          email: isSelf ? user?.email ?? '' : '',
          name: p.name ?? '',
          full_name: p.fullName ?? '',
          prefered_hand: p.preferedHand ?? 'Direita',
          prefered_position: p.preferedPosition ?? 'Tanto faz',
          height: p.height != null ? String(p.height) : '',
          birth_date: toDateInput(p.birthday),
        }))
        setPictureUrl(p.pictureUrl ?? undefined)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, playerId, authLoading, canEdit, isSelf, user?.username, user?.email])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password && !form.current_password && isSelf) {
      setError('Para mudar a password tens que escrever a password atual.')
      return
    }

    setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val) payload.append(key, val)
      })
      if (pictureFile) payload.append('finalFile', pictureFile)

      const res = await playersApi.update(playerId, payload)
      // Keep the header in sync when the username or email changed.
      if (res.data.user) setUser(res.data.user)
      navigate(`/players/${playerId}`)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Não foi possível guardar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || (loading && canEdit)) {
    return (
      <div className="l-grid">
        <p className="c-player__message">A carregar…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="l-grid">
        <p className="c-player__message">
          Tens que fazer <Link to="/login">login</Link> para editar um jogador.
        </p>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="l-grid">
        <p className="c-player__message">
          Só podes editar o teu próprio perfil.{' '}
          {user.playerId && <Link to={`/players/edit/${user.playerId}`}>Editar o meu perfil</Link>}
        </p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="l-grid">
        <p className="c-player__message">
          Não foi possível carregar este jogador.{' '}
          <Link to="/players">Ver todos os jogadores</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="l-grid">
      <div className="login_container">
        <div className="inner_login_container">

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} encType="multipart/form-data">

            <label style={{ color: 'black', fontWeight: 'bold' }}>
              Dados de utilizador
            </label>

            <section id="user_data">
              <div className="form-group optional">
                <label htmlFor="username" style={{ color: 'black' }}>Nome de utilizador</label>
                <input
                  className="form-control"
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  placeholder="Nome de utilizador"
                  value={form.username}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group optional">
                <label htmlFor="email" style={{ color: 'black' }}>Email</label>
                <input
                  className="form-control"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  placeholder="email@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              {isSelf && (
                <div className="form-group optional">
                  <label htmlFor="current_password" style={{ color: 'black' }}>
                    Password atual
                  </label>
                  <input
                    className="form-control"
                    id="current_password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Só se quiseres mudar a password"
                    value={form.current_password}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="form-group optional">
                <label htmlFor="password" style={{ color: 'black' }}>Nova password</label>
                <input
                  className="form-control"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Deixa em branco para manter"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </section>

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
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group optional">
                <label htmlFor="full_name" style={{ color: 'black' }}>Nome completo</label>
                <input
                  className="form-control"
                  id="full_name"
                  name="full_name"
                  type="text"
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
                <label htmlFor="prefered_position" style={{ color: 'black' }}>
                  Posição preferida
                </label>
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
                <label htmlFor="birth_date" style={{ color: 'black' }}>
                  Data de nascimento
                </label>
                <input
                  className="form-control"
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label style={{ color: 'black', fontWeight: 'bold' }}>
                  Fotografia de jogador
                </label>
                <PlayerPictureInput
                  onChange={file => setPictureFile(file)}
                  initialUrl={pictureUrl}
                />
              </div>
            </section>

            <section className="line_group">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'A guardar...' : 'Submeter'}
              </button>
            </section>

          </form>
        </div>
      </div>
    </div>
  )
}
