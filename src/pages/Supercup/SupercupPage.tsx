import { useMemo, useState } from 'react'
import { useSupercup } from '@/context/SupercupContext'
import { SupercupMatch, SupercupRound, SUPERCUP_MAX_PLAYERS, SUPERCUP_ROUND_LABELS } from '@/types/supercup'
import LeagueMatchCard from '@/components/LeagueMatchCard'

type Tab = 'bracket' | 'teams' | 'standings' | 'setup'

const DEFAULT_PLAYER_PICTURE = '/static/images/Player/default_player.jpg'

const ROUND_ORDER: SupercupRound[] = [
  'quarter',
  'semi',
  'consolation_semi',
  'final',
  'third',
  'fifth',
  'seventh',
]

const PLACE_BADGE: Record<number, { color: string; bg: string }> = {
  1: { color: '#7a5800', bg: '#fff0b0' },
  2: { color: '#2d3748', bg: '#e8edf2' },
  3: { color: '#7a3100', bg: '#ffebd8' },
  4: { color: '#003380', bg: '#dbeafe' },
  5: { color: '#145a32', bg: '#d1fae5' },
  6: { color: '#581c87', bg: '#ede9fe' },
  7: { color: '#334155', bg: '#e2e8f0' },
  8: { color: '#334155', bg: '#e2e8f0' },
}

export default function SupercupPage() {
  const {
    state,
    setTitle,
    addPlayer,
    removePlayer,
    buildTeamsFromPlayers,
    generateBracket,
    setResult,
    clearResult,
    resetSupercup,
    getTeamById,
    getPlacements,
  } = useSupercup()

  const [activeTab, setActiveTab] = useState<Tab>(state.bracketGenerated ? 'bracket' : 'setup')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [editing, setEditing] = useState<Record<string, { s1: string; s2: string }>>({})

  const placements = useMemo(() => getPlacements(), [getPlacements])
  const placementByTeam = useMemo(() => {
    const map = new Map<string, number>()
    placements.forEach(p => map.set(p.team.id, p.place))
    return map
  }, [placements])

  function tabClass(tab: Tab) {
    return `c-tor-header__item${activeTab === tab ? ' c-tor-header__item--active' : ''}`
  }

  function tabContentClass(tab: Tab) {
    return `${activeTab === tab ? ' is-visible' : ''}`
  }

  function teamCardPlayers(teamId: string | null) {
    const team = getTeamById(teamId)
    const placeholder = { id: null, name: 'A definir', fullName: 'A definir', pictureUrl: DEFAULT_PLAYER_PICTURE, rankingPoints: 0 }
    if (!team) return [placeholder, placeholder] as [typeof placeholder, typeof placeholder]
    return team.players.map(p => ({
      id: null,
      name: p.name,
      fullName: p.name,
      pictureUrl: DEFAULT_PLAYER_PICTURE,
      rankingPoints: 0,
    })) as [typeof placeholder, typeof placeholder]
  }

  function teamLabel(teamId: string | null): string {
    const team = getTeamById(teamId)
    if (!team) return 'A definir'
    return `Equipa ${team.seed}`
  }

  function renderMatch(match: SupercupMatch) {
    const draft = editing[match.id]
    const isReady = !!match.team1Id && !!match.team2Id
    const headerPrimary = `${match.label} · ${teamLabel(match.team1Id)} vs ${teamLabel(match.team2Id)}`

    return (
      <div key={match.id} className="c-supercup-match">
        <LeagueMatchCard
          homeTeam={{ players: teamCardPlayers(match.team1Id) }}
          awayTeam={{ players: teamCardPlayers(match.team2Id) }}
          scoreHome={match.score1}
          scoreAway={match.score2}
          headerPrimary={headerPrimary}
          headerSecondary={SUPERCUP_ROUND_LABELS[match.round]}
          showWatchIcon={false}
          showFieldInfo={false}
          playerHrefResolver={() => null}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '8px 0 18px' }}>
          {!isReady ? (
            <span style={{ fontSize: '1.3rem', opacity: 0.6 }}>Aguarda resultado da ronda anterior</span>
          ) : draft ? (
            <>
              <input
                className="form-control"
                style={{ width: '52px', textAlign: 'center' }}
                value={draft.s1}
                onChange={e => setEditing(prev => ({ ...prev, [match.id]: { ...draft, s1: e.target.value } }))}
                placeholder="0"
              />
              <span style={{ opacity: 0.6 }}>-</span>
              <input
                className="form-control"
                style={{ width: '52px', textAlign: 'center' }}
                value={draft.s2}
                onChange={e => setEditing(prev => ({ ...prev, [match.id]: { ...draft, s2: e.target.value } }))}
                placeholder="0"
              />
              <button
                className="c-btn c-btn--small"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const s1 = parseInt(draft.s1, 10)
                  const s2 = parseInt(draft.s2, 10)
                  if (isNaN(s1) || isNaN(s2) || s1 === s2) return
                  setResult(match.id, s1, s2)
                  setEditing(prev => {
                    const next = { ...prev }
                    delete next[match.id]
                    return next
                  })
                }}
              >
                Guardar
              </button>
              <button
                className="c-btn c-btn--small c-btn--secondary"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  setEditing(prev => {
                    const next = { ...prev }
                    delete next[match.id]
                    return next
                  })
                }
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                className="c-btn c-btn--small"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  setEditing(prev => ({
                    ...prev,
                    [match.id]: { s1: String(match.score1 ?? ''), s2: String(match.score2 ?? '') },
                  }))
                }
              >
                {match.played ? 'Editar resultado' : 'Inserir resultado'}
              </button>
              {match.played && (
                <button
                  className="c-btn c-btn--small c-btn--secondary"
                  style={{ cursor: 'pointer' }}
                  onClick={() => clearResult(match.id)}
                >
                  Limpar
                </button>
              )}
            </>
          )}
        </div>
        {draft && draft.s1 !== '' && draft.s1 === draft.s2 && (
          <div style={{ color: '#b91c1c', fontSize: '1.3rem', textAlign: 'center', paddingBottom: '10px' }}>
            Não há empates na Supercup — tem de haver um vencedor.
          </div>
        )}
      </div>
    )
  }

  const playedCount = state.matches.filter(m => m.played).length

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content" style={{ width: '100%' }}>
          <div className="c-tor-header__title">{state.title}</div>
          <div className="c-tor-header__iandt">
            <span>16 jogadores · 8 equipas · 3 jogos garantidos</span>
          </div>
          {state.bracketGenerated && (
            <div className="c-tor-header__iandt">
              <span>{playedCount}/{state.matches.length} jogos concluídos</span>
            </div>
          )}
          <ul className="c-tor-header__nav u-list-clean" role="tablist">
            <li className={tabClass('bracket')} role="presentation">
              <a onClick={() => setActiveTab('bracket')}>Quadro</a>
            </li>
            <li className={tabClass('teams')} role="presentation">
              <a onClick={() => setActiveTab('teams')}>Equipas</a>
            </li>
            <li className={tabClass('standings')} role="presentation">
              <a onClick={() => setActiveTab('standings')}>Classificação</a>
            </li>
            <li className={tabClass('setup')} role="presentation">
              <a onClick={() => setActiveTab('setup')}>Configurar</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="l-grid">
        {/* Quadro */}
        <div className={`c-flex-table--tab ${tabContentClass('bracket')}`} id="supercup_bracket_tab">
          {!state.bracketGenerated ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              Ainda não existe quadro. Vai a <strong>Configurar</strong> para adicionar 16 jogadores e gerar o quadro.
            </div>
          ) : (
            ROUND_ORDER.map(round => {
              const roundMatches = state.matches.filter(m => m.round === round).sort((a, b) => a.order - b.order)
              if (roundMatches.length === 0) return null
              return (
                <section key={round} style={{ marginBottom: '18px' }}>
                  <h3 className="c-section__title" style={{ fontSize: '2rem', marginBottom: '8px' }}>
                    {SUPERCUP_ROUND_LABELS[round]}
                  </h3>
                  <div className="l-grid l-grid--tor">{roundMatches.map(renderMatch)}</div>
                </section>
              )
            })
          )}
        </div>

        {/* Equipas */}
        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('teams')}`} id="supercup_teams_tab">
          {state.teams.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>Sem equipas formadas</div>
          ) : (
            <table className="classification_table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipa</th>
                  <th>Jogadores</th>
                  <th>Lugar final</th>
                </tr>
              </thead>
              <tbody>
                {state.teams.map(team => {
                  const place = placementByTeam.get(team.id)
                  const badge = place ? PLACE_BADGE[place] : undefined
                  return (
                    <tr key={team.id} className="player_classification_row">
                      <td>{team.seed}</td>
                      <td>Equipa {team.seed}</td>
                      <td className="shuffle-player-name-cell">
                        <span className="shuffle-player-name">
                          <span>{team.players[0].name} / {team.players[1].name}</span>
                        </span>
                      </td>
                      <td>
                        {place ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 7px',
                              borderRadius: '4px',
                              fontSize: '1.2rem',
                              fontWeight: 700,
                              color: badge?.color,
                              backgroundColor: badge?.bg,
                            }}
                          >
                            {place}.º
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Classificação final */}
        <div className={`c-flex-table--shuffle-games c-flex-table c-flex-table--ranking c-flex-table--tab ${tabContentClass('standings')}`} id="supercup_standings_tab">
          {placements.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
              A classificação final aparece à medida que os jogos de atribuição de lugar são concluídos.
            </div>
          ) : (
            <table className="classification_table">
              <thead>
                <tr>
                  <th>Lugar</th>
                  <th>Equipa</th>
                  <th>Jogadores</th>
                </tr>
              </thead>
              <tbody>
                {placements.map(({ place, team }) => {
                  const badge = PLACE_BADGE[place]
                  return (
                    <tr key={team.id} className="player_classification_row">
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: badge?.color,
                            backgroundColor: badge?.bg,
                          }}
                        >
                          {place}.º
                        </span>
                      </td>
                      <td>Equipa {team.seed}</td>
                      <td className="shuffle-player-name-cell">
                        <span className="shuffle-player-name">
                          <span>{team.players[0].name} / {team.players[1].name}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Configurar */}
        <div className={`c-flex-table--tab ${tabContentClass('setup')}`} id="supercup_setup_tab">
          <div style={{ display: 'grid', gap: '16px', maxWidth: '620px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
                Nome do torneio
              </label>
              <input
                className="form-control"
                value={state.title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
                Jogadores ({state.players.length}/{SUPERCUP_MAX_PLAYERS})
              </label>
              <form
                style={{ display: 'flex', gap: '8px' }}
                onSubmit={e => {
                  e.preventDefault()
                  addPlayer(newPlayerName)
                  setNewPlayerName('')
                }}
              >
                <input
                  className="form-control"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  placeholder="Nome do jogador"
                  disabled={state.players.length >= SUPERCUP_MAX_PLAYERS}
                  style={{ flex: 1 }}
                />
                <button className="c-btn c-btn--small" type="submit" style={{ cursor: 'pointer' }}>
                  Adicionar
                </button>
              </form>

              <ul className="u-list-clean" style={{ marginTop: '10px', display: 'grid', gap: '4px' }}>
                {state.players.map((p, idx) => (
                  <li
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '1.4rem',
                      borderBottom: '1px solid #ececec',
                      padding: '4px 0',
                    }}
                  >
                    <span>{idx + 1}. {p.name}</span>
                    <button
                      onClick={() => removePlayer(p.id)}
                      style={{ border: 0, background: 'none', cursor: 'pointer', color: '#b91c1c' }}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="c-btn c-btn--small"
                style={{ cursor: 'pointer', opacity: state.players.length === SUPERCUP_MAX_PLAYERS ? 1 : 0.5 }}
                disabled={state.players.length !== SUPERCUP_MAX_PLAYERS}
                onClick={() => buildTeamsFromPlayers(true)}
              >
                Sortear equipas
              </button>
              <button
                className="c-btn c-btn--small"
                style={{ cursor: 'pointer', opacity: state.players.length === SUPERCUP_MAX_PLAYERS ? 1 : 0.5 }}
                disabled={state.players.length !== SUPERCUP_MAX_PLAYERS}
                onClick={() => buildTeamsFromPlayers(false)}
              >
                Equipas por ordem
              </button>
              <button
                className="c-btn c-btn--small"
                style={{ cursor: 'pointer', opacity: state.teams.length === 8 ? 1 : 0.5 }}
                disabled={state.teams.length !== 8}
                onClick={() => {
                  generateBracket()
                  setActiveTab('bracket')
                }}
              >
                Gerar quadro
              </button>
              <button
                className="c-btn c-btn--small c-btn--secondary"
                style={{ cursor: 'pointer' }}
                onClick={resetSupercup}
              >
                Reiniciar Supercup
              </button>
            </div>

            <p style={{ fontSize: '1.3rem', opacity: 0.7 }}>
              Formato: quartos de final, meias-finais (vencedores) e meias-finais de consolação (derrotados),
              terminando com os jogos de 1.º, 3.º, 5.º e 7.º lugar. Todas as equipas jogam exatamente 3 jogos.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
