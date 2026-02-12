import { useState } from "react";
import { useTournament } from "@/context/TournamentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, RotateCcw, Calculator, Shuffle, Zap, Users } from "lucide-react";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchCard } from "@/components/MatchCard";
import { DivisionView } from "@/components/DivisionView";
import { DIVISION_MULTIPLIERS } from "@/types/tournament";
import { toast } from "sonner";

type Tab = "standings" | "matches" | "divisions";

const Index = () => {
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
    { key: "standings", label: "Standings" },
    { key: "matches", label: "Matches" },
    { key: "divisions", label: "Divisions" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                <span className="text-primary">Padel</span> Tournament
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {state.players.length}/48 players · Matchweek {state.currentMatchweek}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Add player */}
          <div className="flex gap-2 mt-6">
            <Input
              placeholder="Player name..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              className="bg-secondary/80 border-border max-w-xs"
            />
            <Button onClick={handleAddPlayer} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
            {state.players.length === 0 && (
              <Button variant="outline" onClick={handleLoadTestPlayers} className="border-accent/30 text-accent hover:bg-accent/10">
                <Users className="h-4 w-4 mr-1" />
                Load 48 Test Players
              </Button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalculateDivisions}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Regroup Divisions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateMatchweek}
              className="border-accent/30 text-accent hover:bg-accent/10"
            >
              <Zap className="h-4 w-4 mr-1" />
              Generate Matchweek
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="container max-w-5xl mx-auto px-4">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-6">
        {activeTab === "standings" && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-bold text-lg">Overall Classification</h2>
            </div>
            {state.players.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Add 48 players to get started
              </div>
            ) : (
              <StandingsTable />
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div>
            <h2 className="font-display font-bold text-lg mb-4">
              Matchweek {state.currentMatchweek}
            </h2>
            {currentMatches.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                Generate a matchweek to see matches
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {currentMatches.map((match) => (
                  <MatchCard key={match.id} matchId={match.id} />
                ))}
              </div>
            )}

            {/* Previous matchweeks */}
            {state.currentMatchweek > 1 && (
              <div className="mt-8">
                <h3 className="font-display font-bold text-base mb-3 text-muted-foreground">
                  Previous Matchweeks
                </h3>
                {Array.from({ length: state.currentMatchweek - 1 }, (_, i) => i + 1)
                  .reverse()
                  .map((mw) => {
                    const mwMatches = state.matches.filter((m) => m.matchweek === mw);
                    return (
                      <details key={mw} className="mb-3">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground py-2">
                          Matchweek {mw} ({mwMatches.filter((m) => m.played).length}/{mwMatches.length} played)
                        </summary>
                        <div className="grid gap-3 md:grid-cols-2 mt-2">
                          {mwMatches.map((match) => (
                            <MatchCard key={match.id} matchId={match.id} />
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
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                Calculate divisions first
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {state.divisions.map((d) => (
                    <button
                      key={d.number}
                      onClick={() => setSelectedDivision(d.number)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${
                        selectedDivision === d.number
                          ? `bg-division-${d.number}/20 border-division-${d.number}/50 text-division-${d.number}`
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Division {d.number}
                    </button>
                  ))}
                </div>
                <DivisionView divisionNumber={selectedDivision} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
