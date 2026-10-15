import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FormatBadge from '@/components/v2/FormatBadge'
import MatchCard from '@/components/v2/MatchCard'
import { formatPoints } from '@/components/v2/PointsValue'
import { V2NotFound } from '@/features/competitions/v2http'
import PlayerCompare from './PlayerCompare'
import { byRanking, useV2Player, useV2PlayerMatches, useV2Players } from './api'

type Tab = 'personal' | 'sports'

const DEFAULT_LARGE_PICTURE =
  'https://storage.googleapis.com/portopadelleague-storage/images/Player/large_pic_default.jpg'
const FALLBACK = '/static/images/Player/default_player.jpg'

// The API sends unrounded numbers; show at most one decimal (pt-PT).
const num = (v?: number) => (v === undefined || v === null ? '—' : v.toLocaleString('pt-PT', { maximumFractionDigits: 1 }))
const pctVal = (v?: number) => (v === undefined || v === null ? '—' : `${Math.round(v)}%`)

function StatBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="c-ranking-header__data-box">
      <p className="c-ranking-header__data-title">{title}</p>
      <p className="c-ranking-header__data">{children}</p>
    </div>
  )
}

export default function PlayerPage() {
  const id = Number(useParams().id)
  const { data: player, isLoading, error } = useV2Player(id)
  const { data: list } = useV2Players()
  const { data: matches } = useV2PlayerMatches(id)
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [other, setOther] = useState<number | null>(null)

  const sorted = useMemo(() => [...(list ?? [])].sort(byRanking), [list])
  const idx = sorted.findIndex((p) => p.id === id)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null

  const lastMatches = useMemo(
    () =>
      [...(matches ?? [])]
        .sort((x, y) => (y.scheduledAt ? Date.parse(y.scheduledAt) : 0) - (x.scheduledAt ? Date.parse(x.scheduledAt) : 0))
        .slice(0, 10),
    [matches],
  )

  if (isLoading) return <div className="loader" />
  if (error || !player) {
    return (
      <div className="l-grid">
        <p className="c-player__message">
          {error instanceof V2NotFound ? 'Jogador não encontrado.' : 'Não foi possível carregar este jogador.'}{' '}
          <Link to="/players">Ver todos os jogadores</Link>
        </p>
      </div>
    )
  }

  // Agreed keys (matchesPlayed, ...) with the backend's first names (played, wins, winRate) as fallback.
  const raw = player.stats ?? {}
  const s: Record<string, number> = {
    ...raw,
    matchesPlayed: raw.matchesPlayed ?? raw.played,
    matchesWon: raw.matchesWon ?? raw.wins,
    matchesDrawn: raw.matchesDrawn ?? raw.draws,
    matchesLost: raw.matchesLost ?? raw.losses,
    efficiency: raw.efficiency ?? raw.winRate,
  }
  const history = player.history ?? []
  const name = player.fullName || player.name

  return (
    <>
      <div className="l-grid">
        <div className="c-player">
          <div className="c-player__content">
            <img className="c-player__img" src={player.largePictureUrl || DEFAULT_LARGE_PICTURE} alt="" />

            {prev && (
              <div className="c-player__prev">
                <Link to={`/players/${prev.id}`}>
                  <img src="/static/images/chevron-left.svg" alt="anterior" />
                  <div
                    className="u-img-cropped u-img-cropped--team"
                    style={{ backgroundImage: `url(${prev.pictureUrl || FALLBACK})` }}
                  />
                </Link>
              </div>
            )}

            <div className="l-container_player">
              <div className="c-ranking-header c-ranking-header--no-image">
                <h1 className="c-ranking-header__title">{name}</h1>
                <div className="l-container_player l-container--data">
                  <div className="c-ranking-header__data-box">
                    <p className="c-ranking-header__data-title">Ranking</p>
                    <p className="c-ranking-header__data">{player.rankingPosition ?? '—'}</p>
                  </div>
                  <div className="c-ranking-header__data-box">
                    <p className="c-ranking-header__data-title">Pontos</p>
                    <p className="c-ranking-header__data">{formatPoints(player.rankingPoints, 0)}</p>
                  </div>
                </div>
                <img src="/static/images/pt.png" alt="Portugal" />
              </div>
            </div>

            <ul className="c-player__nav u-list-clean" role="tablist">
              <li
                className={`c-player__item${activeTab === 'personal' ? ' c-player__item--active' : ''}`}
                role="presentation"
              >
                <a onClick={() => setActiveTab('personal')} style={{ cursor: 'pointer' }}>Dados pessoais</a>
              </li>
              <li
                className={`c-player__item${activeTab === 'sports' ? ' c-player__item--active' : ''}`}
                role="presentation"
              >
                <a onClick={() => setActiveTab('sports')} style={{ cursor: 'pointer' }}>Dados desportivos</a>
              </li>
            </ul>

            {next && (
              <div className="c-player__next">
                <Link to={`/players/${next.id}`}>
                  <img src="/static/images/chevron-right.svg" alt="próximo" />
                  <div
                    className="u-img-cropped u-img-cropped--team"
                    style={{ backgroundImage: `url(${next.pictureUrl || FALLBACK})` }}
                  />
                </Link>
              </div>
            )}

            <div className="u-gradient u-gradient--horizontal" />
          </div>

          <div className="c-player__footer">
            <div className="c-player__img-container">
              <div
                className="u-img-cropped"
                id="player_image_top"
                style={{ backgroundImage: `url(${player.pictureUrl || FALLBACK})` }}
              />
            </div>
            <div className="l-container">
              <ul
                className={`c-player__data-list u-list-clean${activeTab === 'personal' ? ' c-player__data-list--is-visible' : ''}`}
                id="personal_data_tab"
              >
                <li className="c-player__data-item">
                  <h3>Data de nascimento</h3>
                  <p>{player.birthDate ? new Date(player.birthDate).toLocaleDateString('pt-PT') : 'Não definido'}</p>
                </li>
                <li className="c-player__data-item">
                  <h3>Altura</h3>
                  <p>{player.height ?? '—'}</p>
                </li>
              </ul>

              <ul
                className={`c-player__data-list u-list-clean${activeTab === 'sports' ? ' c-player__data-list--is-visible' : ''}`}
                id="sports_data_tab"
              >
                <li className="c-player__data-item">
                  <h3>Mão preferida</h3>
                  <p>{player.preferredHand ?? '—'}</p>
                </li>
                <li className="c-player__data-item">
                  <h3>Posição de jogo</h3>
                  <p>{player.preferredPosition ?? '—'}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="l-grid player_tables_container">
        <div className="c-ranking-header c-ranking-header--no-image c-ranking-header--table">
          <div className="l-container_player l-container--data player_games_table">
            <StatBox title="Encontros jogados">{num(s.matchesPlayed)}</StatBox>
            <StatBox title="Encontros ganhos">{num(s.matchesWon)}</StatBox>
            <StatBox title="Encontros perdidos">{num(s.matchesLost)}</StatBox>
            <StatBox title="Encontros empatados">{num(s.matchesDrawn)}</StatBox>
            <StatBox title="Eficácia">{pctVal(s.efficiency)}</StatBox>
          </div>
        </div>
      </div>

      <div className="l-grid player_tables_container">
        <div className="c-ranking-header c-ranking-header--no-image c-ranking-header--table">
          <div className="l-container_player l-container--data player_games_table">
            <StatBox title="Torneios jogados">{num(s.tournamentsPlayed)}</StatBox>
            <StatBox title="Jornadas jogadas">{num(s.matchweeksPlayed)}</StatBox>
            <StatBox title="Jornadas Faltadas">{num(s.matchweeksMissed)}</StatBox>
            <StatBox title="Jornadas por torneio">{num(s.matchweeksPerTournament)}</StatBox>
            <StatBox title="Assiduidade">{pctVal(s.attendance)}</StatBox>
          </div>
        </div>
      </div>

      <div className="l-grid player_tables_container overflow-x-auto">
        <div className="c-flex-table c-flex-table--ranking c-flex-table--tab c-flex-table--blue is-visible">
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Torneio</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item">
                  <Link to={row.groupId ? `/groups/${row.groupId}` : `/competitions/${row.competition?.id}`}>
                    {/* One line: rows in c-flex-table have a fixed height (the old page showed the division name only). */}
                    <span
                      className="block truncate max-w-[160px] sm:max-w-[260px]"
                      title={[row.competition?.name, row.groupName].filter(Boolean).join(' · ')}
                    >
                      {row.groupName || row.competition?.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Formato</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item">
                  {row.competition ? <FormatBadge competition={row.competition} /> : <span>—</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Posição</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item"><span>{row.place ?? '—'}</span></li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Jogos</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item"><span>{row.played ?? '—'}</span></li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Vitórias</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item"><span>{row.wins ?? '—'}</span></li>
              ))}
            </ul>
          </div>
          <div className="c-flex-table__column">
            <div className="c-flex-table__heading"><h3>Pontos de Ranking</h3></div>
            <ul className="c-flex-table__list u-list-clean">
              {history.map((row, i) => (
                <li key={i} className="c-flex-table__item"><span>{formatPoints(row.awardPoints, 0)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="py-[16px]">
        <h2 className="text-[18px] font-semibold text-center mb-[12px]">Últimos jogos</h2>
        <div className="max-w-[700px] mx-auto flex flex-col gap-[12px] px-[16px]">
          {lastMatches.length === 0 && <p className="text-center text-[15px] text-gray-500">Sem jogos registados.</p>}
          {lastMatches.map((m) => <MatchCard key={m.id} match={m} showGroup />)}
        </div>
      </section>

      <section className="py-[16px]">
        <h2 className="text-[18px] font-semibold text-center mb-[12px]">Comparar</h2>
        <div className="max-w-[700px] mx-auto flex flex-col gap-[16px] px-[16px]">
          <select
            value={other ?? ''}
            onChange={(e) => setOther(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-[8px] border border-gray-300 bg-white px-[12px] py-[10px] text-[15px]"
          >
            <option value="">Escolher jogador…</option>
            {sorted.filter((p) => p.id !== id).map((p) => (
              <option key={p.id} value={p.id}>{p.fullName || p.name}</option>
            ))}
          </select>
          {other && <PlayerCompare a={id} b={other} />}
        </div>
      </section>
    </>
  )
}
