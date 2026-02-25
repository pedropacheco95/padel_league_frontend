import { ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { mainApi } from '@/api/main'
import { Sponsor } from '@/types'


interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])

  // Hide loading screen on mount — replaces window 'load' event from main.js
  useEffect(() => {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) loadingScreen.style.display = 'none'
  }, [])

  useEffect(() => {
    mainApi.index()
      .then(res => setSponsors(res.data.sponsors))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <div id="loading-screen">
        <div className="loader"></div>
      </div>

      <header className="c-global-header" id="global-header">
        <div className="l-container">
          <div className="c-btn-container for_login_button_bigger">
            {!user ? (
              <>
                <div className="c-btn-topright">
                  <Link to="/login">Log in</Link>
                </div>
                <div className="c-btn-topright">
                  <Link to="/register">Registar</Link>
                </div>
              </>
            ) : (
              <>
                <div className="c-btn-topright">
                  <Link to={`/players/edit/${user.playerId}`}>
                    {user.username}
                  </Link>
                </div>
                <div className="c-btn-topright">
                  <a onClick={handleLogout} style={{border: 'none', cursor: 'pointer' }}>
                    Log out
                  </a>
                </div>
                {user.isAdmin && (
                  <div className="c-btn-topright">
                    <Link to="/matches/for_edit">Editar jogos</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="c-header-line__container">
          <div className="c-header-line__item"></div>
          <div className="c-global-header__logo-container">
            <Link
              className="c-global-header__logo c-global-header__logo-full"
              to="/"
              id="logo"
            >
              <img className="main-logo" src="/static/images/logo.png" alt="Logo" />
            </Link>
          </div>
          <div className="c-header-line__item"></div>
        </div>

        <nav className="c-main-nav" id="main-nav">
          <ul className="c-main-nav__block u-list-clean">
            <li className="c-main-nav__item">
              <Link className="c-main-nav__link" to="/tournaments" title="tournaments">
                Torneios
              </Link>
            </li>
            <li className="c-main-nav__item">
              <Link className="c-main-nav__link" to="/players" title="players">
                Jogadores
              </Link>
            </li>
            <li className="c-main-nav__item">
              <Link className="c-main-nav__link" to="/calendar" title="calendar">
                Calendário
              </Link>
            </li>
            <li className="c-main-nav__item">
              <Link className="c-main-nav__link" to="/shop" title="shop">
                Loja
              </Link>
            </li>
            <li className="c-main-nav__item for_login_logout">
              {!user ? (
                <>
                  <Link className="c-main-nav__link" to="/login">Log in</Link>
                  <Link className="c-main-nav__link" to="/register">Registar</Link>
                </>
              ) : (
                <>
                  {user.isAdmin && (
                    <Link className="c-main-nav__link" to="/matches/for_edit">
                      Editar jogos
                    </Link>
                  )}
                  <a
                    className="c-main-nav__link"
                    onClick={handleLogout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Log out
                  </a>
                </>
              )}
            </li>
          </ul>
        </nav>
      </header>

      <div className="l-site-container" id="site-container">
        {children}
      </div>

      <footer className="c-footer">
        <div className="l-container c-footer__inner">
          <div className="c-footer__section c-footer__nav">
            <h4 className="c-footer__title">Navegação</h4>
            <ul className="c-footer__list u-list-clean">
              <li><Link to="/">Início</Link></li>
              <li><Link to="/tournaments">Torneios</Link></li>
              <li><Link to="/players">Jogadores</Link></li>
              <li><Link to="/calendar">Calendário</Link></li>
              <li><Link to="/shop">Loja</Link></li>
              <li><Link to="/statues">Estatutos</Link></li>
            </ul>
          </div>

          <div className="c-footer__section c-footer__sponsors">
            <h4 className="c-footer__title">Patrocinadores</h4>
            <div className="c-footer__sponsor-logos">
              {sponsors.map(sponsor => (
                <a key={sponsor.id} href={sponsor.url}>
                  <div className="c-footer__sponsor-logo">
                    <img src={sponsor.imageUrl ?? ''} alt={sponsor.name} />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="c-footer__section c-footer__info">
            <h4 className="c-footer__title">Sobre</h4>
            <p>Se houver alguma nova ideia para o torneio ou organização,</p>
            <p>se houver qualquer problema com a estrutura, se houver qualquer erro</p>
            <p>se tiverem um bebé a chorar porque precisa de mudar a fralda</p>
            <p>qualquer assunto, dia ou noite, a qualquer hora</p>
            <p>por favor não hesitem em contactar o Dinis Brito e Faro.</p>
            <p>Estamos aqui para ajudar.</p>
            <p>Número: <a href="tel:+351915603480">+351 915 603 480</a></p>
            <br />
            <br />
            <p>Se houver algum problema com o site... Contratem um gajo para fazer isto</p>
            <p>Não sou vosso empregado</p>
          </div>
        </div>
      </footer>
    </>
  )
}
