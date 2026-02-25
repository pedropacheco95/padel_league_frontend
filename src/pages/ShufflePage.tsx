import { useState } from "react";
import { useTournament } from "@/context/TournamentContext";
import { Button } from "@/components/ui/button";
import { UserPlus, RotateCcw, Shuffle, Zap, Users, Save, Pencil, AlertTriangle, UserMinus } from "lucide-react";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchCard } from "@/components/MatchCard";
import { DivisionView } from "@/components/DivisionView";
import { DIVISION_MULTIPLIERS, Match } from "@/types/tournament";
import { toast } from "sonner";

type Tab = "standings" | "matches" | "divisions";

function orderMatches(matches: Match[]): Match[] {
  const byDiv = new Map<number, Match[]>();
  matches.forEach((m) => {
    if (!byDiv.has(m.division)) byDiv.set(m.division, []);
    byDiv.get(m.division)!.push(m);
  });

  const result: Match[] = [];
  byDiv.forEach((divMatches) => {
    const teamSet = new Map<string, [string, string]>();
    divMatches.forEach((m) => {
      const k1 = m.team1.join(",");
      const k2 = m.team2.join(",");
      if (!teamSet.has(k1)) teamSet.set(k1, m.team1);
      if (!teamSet.has(k2)) teamSet.set(k2, m.team2);
    });
    const teams = Array.from(teamSet.entries());
    const schedule = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
    const ordered: Match[] = [];
    for (const [a, b] of schedule) {
      const ta = teams[a]?.[0];
      const tb = teams[b]?.[0];
      if (!ta || !tb) continue;
      const found = divMatches.find((m) => {
        const k1 = m.team1.join(",");
        const k2 = m.team2.join(",");
        return (k1 === ta && k2 === tb) || (k1 === tb && k2 === ta);
      });
      if (found) ordered.push(found);
    }
    divMatches.forEach((m) => { if (!ordered.includes(m)) ordered.push(m); });
    result.push(...ordered);
  });
  return result;
}

const TEST_NAMES = [
  "Carlos García", "Miguel Torres", "Pablo Ruiz", "Alejandro López", "Javier Martín",
  "Daniel Sánchez", "Fernando Díaz", "Andrés Moreno", "Diego Hernández", "Rafael Jiménez",
  "Sergio Romero", "Álvaro Navarro", "Iván Domínguez", "Hugo Vázquez", "Marcos Gil",
  "Adrián Molina", "Óscar Ortega", "Rubén Delgado", "Jorge Ramos", "Luis Prieto",
  "Manuel Blanco", "Víctor Castro", "Pedro Méndez", "Antonio Guerrero", "Roberto Peña",
  "Tomás Medina", "Eduardo Santos", "Raúl Iglesias", "Nicolás Crespo", "Gabriel Flores",
  "Mario Ferrer", "Enrique Cabrera", "David Suárez", "Samuel Herrera", "Martín Aguilar",
  "Alberto Pascual", "Santiago Cortés", "Felipe Caballero", "Ricardo Campos", "Gonzalo León",
  "Ignacio Vega", "Emilio Fuentes", "Bruno Reyes", "Lucas Carrasco", "Mateo Gallego",
  "Jaime Nieto", "Arturo Pardo", "Cristian Lara",
];

const ShufflePage = () => {
  const {
    state,
    addPlayer,
    removePlayer,
    calculateDivisions,
    generateMatchweek,
    resetTournament,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedDivision, setSelectedDivision] = useState(1);
  const [matchesDivFilter, setMatchesDivFilter] = useState(0);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    if (state.players.length >= 48) {
      toast.error("Maximum 48 players reached");
      return;
    }
    addPlayer(name);
    setNewPlayerName("");
    toast.success(`${name} added`);
  };

  const handleCalculateDivisions = () => {
    if (state.players.length !== 48) {
      toast.error("Need exactly 48 players to calculate divisions");
      return;
    }
    calculateDivisions();
    toast.success("Divisions recalculated!");
  };

  const handleGenerateMatchweek = () => {
    if (state.divisions.length === 0) {
      toast.error("Calculate divisions first");
      return;
    }
    generateMatchweek();
    toast.success(`Matchweek ${state.currentMatchweek + 1} generated!`);
  };

  const handleLoadTestPlayers = () => {
    if (state.players.length > 0) {
      toast.error("Reset first before loading test players");
      return;
    }
    TEST_NAMES.forEach((name) => addPlayer(name));
    toast.success("48 test players loaded!");
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will delete all data.")) {
      resetTournament();
      toast.success("Tournament reset");
    }
  };

  const currentMatches = state.matches.filter(
    (m) => m.matchweek === state.currentMatchweek
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "standings", label: "Classificação" },
    { key: "matches", label: "Jogos" },
    { key: "divisions", label: "Divisões" },
  ];

  return (
    <div className="l-section">
      {/* Header */}
      <section className="c-tor-box c-tor-box--m">
        <div className="c-teams__header c-teams__header--played">
          <div className="c-teams__iandt_edit" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Padel Shuffle
              </h1>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {state.players.length}/48 jogadores · Jornada {state.currentMatchweek}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="c-btn c-btn--small"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px' }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Add player row */}
        <div className="c-teams__box" style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Nome do jogador..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            className="game_results"
            style={{ flex: '1', minWidth: '150px', padding: '6px 10px', fontSize: '0.85rem' }}
          />
          <button
            onClick={handleAddPlayer}
            className="c-btn c-btn--small"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </button>
          {state.players.length === 0 && (
            <button
              onClick={handleLoadTestPlayers}
              className="c-btn c-btn--small"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <Users className="h-4 w-4" />
              Carregar 48 Teste
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="c-teams__box" style={{ padding: '8px 16px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCalculateDivisions}
            className="c-btn c-btn--small"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <Shuffle className="h-4 w-4" />
            Reagrupar Divisões
          </button>
          <button
            onClick={handleGenerateMatchweek}
            className="c-btn c-btn--small"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <Zap className="h-4 w-4" />
            Gerar Jornada
          </button>
        </div>
      </section>

      {/* Tabs - using app nav style */}
      <div className="c-main-nav" style={{ justifyContent: 'center', marginBottom: '16px' }}>
        <ul className="c-main-nav__block u-list-clean" style={{ display: 'flex', justifyContent: 'center' }}>
          {tabs.map((tab) => (
            <li key={tab.key} className="c-main-nav__item">
              <a
                className={`c-main-nav__link ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                style={{ cursor: 'pointer', fontWeight: activeTab === tab.key ? 700 : 400, borderBottom: activeTab === tab.key ? '2px solid currentColor' : 'none' }}
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Content */}
      {activeTab === "standings" && (
        <section className="c-tor-box c-tor-box--m">
          <div className="c-teams__header c-teams__header--played">
            <div className="c-teams__iandt_edit" style={{ width: '100%' }}>
              <strong>Classificação Geral</strong>
            </div>
          </div>
          <div className="c-teams__box" style={{ padding: 0 }}>
            {state.players.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
                Adiciona 48 jogadores para começar
              </div>
            ) : (
              <StandingsTable />
            )}
          </div>
        </section>
      )}

      {activeTab === "matches" && (
        <div>
          <section className="c-tor-box c-tor-box--m">
            <div className="c-teams__header c-teams__header--played">
              <div className="c-teams__iandt_edit" style={{ width: '100%' }}>
                <strong>Jornada {state.currentMatchweek}</strong>
              </div>
            </div>
          </section>

          {/* Division filter */}
          {state.divisions.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', margin: '12px 0', flexWrap: 'wrap' }}>
              <button
                onClick={() => setMatchesDivFilter(0)}
                className="c-btn c-btn--small"
                style={{
                  cursor: 'pointer',
                  fontWeight: matchesDivFilter === 0 ? 700 : 400,
                  opacity: matchesDivFilter === 0 ? 1 : 0.6,
                }}
              >
                Todas
              </button>
              {state.divisions.map((d) => (
                <button
                  key={d.number}
                  onClick={() => setMatchesDivFilter(d.number)}
                  className="c-btn c-btn--small"
                  style={{
                    cursor: 'pointer',
                    fontWeight: matchesDivFilter === d.number ? 700 : 400,
                    opacity: matchesDivFilter === d.number ? 1 : 0.6,
                  }}
                >
                  Div {d.number}
                </button>
              ))}
            </div>
          )}

          {currentMatches.length === 0 ? (
            <section className="c-tor-box c-tor-box--m">
              <div className="c-teams__box" style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
                Gera uma jornada para ver os jogos
              </div>
            </section>
          ) : (
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {orderMatches(
                currentMatches.filter((m) => matchesDivFilter === 0 || m.division === matchesDivFilter)
              ).map((match, idx) => (
                <MatchCard key={match.id} matchId={match.id} gameNumber={idx + 1} />
              ))}
            </div>
          )}

          {/* Previous matchweeks */}
          {state.currentMatchweek > 1 && (
            <div style={{ marginTop: '24px' }}>
              <section className="c-tor-box c-tor-box--m">
                <div className="c-teams__header" style={{ opacity: 0.7 }}>
                  <div className="c-teams__iandt_edit" style={{ width: '100%' }}>
                    <strong>Jornadas Anteriores</strong>
                  </div>
                </div>
              </section>
              {Array.from({ length: state.currentMatchweek - 1 }, (_, i) => i + 1)
                .reverse()
                .map((mw) => {
                  const mwMatches = state.matches.filter(
                    (m) => m.matchweek === mw && (matchesDivFilter === 0 || m.division === matchesDivFilter)
                  );
                  return (
                    <details key={mw} style={{ marginBottom: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '8px 0', opacity: 0.7 }}>
                        Jornada {mw} ({mwMatches.filter((m) => m.played).length}/{mwMatches.length} jogados)
                      </summary>
                      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', marginTop: '8px' }}>
                        {orderMatches(mwMatches).map((match, idx) => (
                          <MatchCard key={match.id} matchId={match.id} gameNumber={idx + 1} />
                        ))}
                      </div>
                    </details>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === "divisions" && (
        <div>
          {state.divisions.length === 0 ? (
            <section className="c-tor-box c-tor-box--m">
              <div className="c-teams__box" style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
                Calcula as divisões primeiro
              </div>
            </section>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {state.divisions.map((d) => (
                  <button
                    key={d.number}
                    onClick={() => setSelectedDivision(d.number)}
                    className="c-btn c-btn--small"
                    style={{
                      cursor: 'pointer',
                      fontWeight: selectedDivision === d.number ? 700 : 400,
                      opacity: selectedDivision === d.number ? 1 : 0.6,
                    }}
                  >
                    Divisão {d.number}
                  </button>
                ))}
              </div>
              <DivisionView divisionNumber={selectedDivision} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShufflePage;
