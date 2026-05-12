import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tournamentsApi } from '@/api/tournaments'
import { Division } from '@/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Não definido'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function TournamentCard({ tournament }: { tournament: Division }) {
  const navigate = useNavigate()

  return (
    <div
      className="c-tournaments c-tournaments--new c-tournaments--fixed tournament__container"
      onClick={() => navigate(`/tournaments/${tournament.id}`)}
    >
      <div className="c-tournaments__container">
        <div className="c-tournaments__poster">
          <div
            className="c-tournaments__img c-tournaments__img--bg"
            style={{ backgroundImage: `url(${tournament.logoImageUrl})` }}
          />
        </div>
        <div className="c-tournaments__content">
          <header className="c-tournaments__top-card">
            <div
              className="c-tournaments__header"
              style={{ background: `url(${tournament.largePictureUrl})` }}
            />
            <p className="c-tournaments__date">
              De {formatDate(tournament.beginningDatetime)} a {formatDate(tournament.endDate)}
            </p>
          </header>
          <footer className="c-tournaments__bottom-card">
            <div className="c-tournaments__header">
              <h3 className="c-tournaments__title">
                {tournament.editionName ? `${tournament.editionName} - ${tournament.name}` : tournament.name}
              </h3>
              <p className="c-tournaments__cat">Rating: {tournament.rating}</p>
            </div>
          </footer>
          <div className="c-tournaments__triggers">
            <Link
              className="c-btn c-btn--secondary"
              to={`/tournaments/${tournament.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              + INFO
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TournamentsPage() {
  const [active, setActive] = useState<Division[]>([])
  const [ended, setEnded] = useState<Division[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tournamentsApi.list().then(({ data }) => {
      setActive(data.active)
      setEnded(data.ended)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return (
    <>
      <section className="c-section">
        <div className="c-section__bg" />
        <div className="l-grid">
          <span className="c-section__line" />
          <h2 className="c-section__title">Próximos torneios</h2>
        </div>
        <div className="l-grid l-grid--flex l-grid--flex-centered tournaments_grid">
          {active.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      </section>

      <section className="c-section">
        <div className="c-section__bg" />
        <div className="l-grid">
          <span className="c-section__line" />
          <h2 className="c-section__title">Torneios já realizados</h2>
        </div>
        <div className="l-grid l-grid--flex l-grid--flex-centered tournaments_grid">
          {showAll &&
            ended.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      </section>

      {!showAll && (
        <form
          className="show_all_tournaments_container"
          onSubmit={(e) => {
            e.preventDefault()
            setShowAll(true)
          }}
        >
          <button type="submit">Ver mais...</button>
        </form>
      )}
    </>
  )
}
