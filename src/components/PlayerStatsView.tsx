import { useState, useMemo } from "react";
import { useTournament } from "@/context/TournamentContext";
import { Player, Match, DIVISION_MULTIPLIERS } from "@/types/tournament";
import { Search, X, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

interface PlayerMatchweekSnapshot {
  matchweek: number;
  points: number;
  position: number;
  division: number;
}

interface MatchResult {
  matchweek: number;
  division: number;
  partnerId: string;
  opponentIds: [string, string];
  teamScore: number;
  oppScore: number;
  won: boolean;
  drew: boolean;
}

interface PlayerStats {
  player: Player;
  divisionsPlayed: number[];
  highestDivision: number;
  lowestDivision: number;
  matchResults: MatchResult[];
  biggestWins: MatchResult[];
  worstLosses: MatchResult[];
  bestResult: MatchResult | null;
  worstResult: MatchResult | null;
  snapshots: PlayerMatchweekSnapshot[];
}

function computePlayerStats(
  playerId: string,
  players: Player[],
  matches: Match[],
  getDivisionForPlayer: (id: string) => number
): PlayerStats {
  const player = players.find((p) => p.id === playerId)!;

  // Get all played matches involving this player
  const results: MatchResult[] = [];
  const divSet = new Set<number>();

  matches
    .filter((m) => m.played)
    .forEach((m) => {
      const removed = m.removedPlayers || [];
      if (removed.includes(playerId)) return;

      const inTeam1 = m.team1.includes(playerId);
      const inTeam2 = m.team2.includes(playerId);
      if (!inTeam1 && !inTeam2) return;

      divSet.add(m.division);

      const isT1 = inTeam1;
      const partnerId = isT1
        ? m.team1.find((id) => id !== playerId)!
        : m.team2.find((id) => id !== playerId)!;
      const opponentIds = (isT1 ? m.team2 : m.team1) as [string, string];
      const teamScore = isT1 ? m.score1! : m.score2!;
      const oppScore = isT1 ? m.score2! : m.score1!;

      results.push({
        matchweek: m.matchweek,
        division: m.division,
        partnerId,
        opponentIds,
        teamScore,
        oppScore,
        won: teamScore > oppScore,
        drew: teamScore === oppScore,
      });
    });

  const divisionsPlayed = Array.from(divSet).sort((a, b) => a - b);

  // Avg opponent ranking position for "biggest wins" / "worst losses"
  const getAvgOppRank = (r: MatchResult) => {
    const sorted = [...players].sort((a, b) => b.points - a.points);
    const pos1 = sorted.findIndex((p) => p.id === r.opponentIds[0]);
    const pos2 = sorted.findIndex((p) => p.id === r.opponentIds[1]);
    return (pos1 + pos2) / 2;
  };

  const wins = results.filter((r) => r.won);
  const losses = results.filter((r) => !r.won && !r.drew);

  // Biggest wins = wins against highest-ranked opponents (lowest avg rank number)
  const biggestWins = [...wins]
    .sort((a, b) => getAvgOppRank(a) - getAvgOppRank(b))
    .slice(0, 3);

  // Worst losses = losses against lowest-ranked opponents (highest avg rank number)
  const worstLosses = [...losses]
    .sort((a, b) => getAvgOppRank(b) - getAvgOppRank(a))
    .slice(0, 3);

  // Best/worst result by score difference
  const allSorted = [...results].sort(
    (a, b) => (b.teamScore - b.oppScore) - (a.teamScore - a.oppScore)
  );
  const bestResult = allSorted[0] || null;
  const worstResult = allSorted[allSorted.length - 1] || null;

  // Compute cumulative snapshots per matchweek
  const maxMw = Math.max(...matches.map((m) => m.matchweek), 0);
  const snapshots: PlayerMatchweekSnapshot[] = [];

  // Recalculate points evolution
  const pointsByMw = new Map<number, number>();
  let cumPoints = 0;
  for (let mw = 1; mw <= maxMw; mw++) {
    const mwResults = results.filter((r) => r.matchweek === mw);
    mwResults.forEach((r) => {
      const multiplier = DIVISION_MULTIPLIERS[r.division] || 1;
      if (r.won) cumPoints += 3 * multiplier;
      else if (r.drew) cumPoints += 1 * multiplier;
    });
    pointsByMw.set(mw, cumPoints);
  }

  // Compute position per matchweek (need all players' cumulative points)
  const allPlayerPoints = new Map<string, Map<number, number>>();
  players.forEach((p) => {
    const pPoints = new Map<number, number>();
    let cum = 0;
    for (let mw = 1; mw <= maxMw; mw++) {
      matches
        .filter((m) => m.played && m.matchweek === mw)
        .forEach((m) => {
          const removed = m.removedPlayers || [];
          if (removed.includes(p.id)) return;
          const inT1 = m.team1.includes(p.id);
          const inT2 = m.team2.includes(p.id);
          if (!inT1 && !inT2) return;
          const ts = inT1 ? m.score1! : m.score2!;
          const os = inT1 ? m.score2! : m.score1!;
          const mult = DIVISION_MULTIPLIERS[m.division] || 1;
          if (ts > os) cum += 3 * mult;
          else if (ts === os) cum += 1 * mult;
        });
      pPoints.set(mw, cum);
    }
    allPlayerPoints.set(p.id, pPoints);
  });

  for (let mw = 1; mw <= maxMw; mw++) {
    const rankings = players
      .map((p) => ({
        id: p.id,
        pts: allPlayerPoints.get(p.id)?.get(mw) || 0,
      }))
      .sort((a, b) => b.pts - a.pts);
    const pos = rankings.findIndex((r) => r.id === playerId) + 1;

    // Division at that matchweek — find from matches
    const mwMatch = matches.find(
      (m) =>
        m.matchweek === mw &&
        (m.team1.includes(playerId) || m.team2.includes(playerId)) &&
        !(m.removedPlayers || []).includes(playerId)
    );

    snapshots.push({
      matchweek: mw,
      points: pointsByMw.get(mw) || 0,
      position: pos,
      division: mwMatch?.division || 0,
    });
  }

  return {
    player,
    divisionsPlayed,
    highestDivision: divisionsPlayed.length > 0 ? Math.min(...divisionsPlayed) : 0,
    lowestDivision: divisionsPlayed.length > 0 ? Math.max(...divisionsPlayed) : 0,
    matchResults: results,
    biggestWins,
    worstLosses,
    bestResult,
    worstResult,
    snapshots,
  };
}

function PlayerSelector({
  label,
  selectedId,
  onSelect,
  onClear,
  players,
}: {
  label: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  players: Player[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      query.trim()
        ? players.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase())
          )
        : players,
    [players, query]
  );

  const selected = selectedId ? players.find((p) => p.id === selectedId) : null;

  if (selected) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center justify-between">
          <span className="font-medium">{selected.name}</span>
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar jogador..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9 bg-secondary border-border"
        />
      </div>
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {filtered.slice(0, 20).map((p) => (
          <button
            key={p.id}
            onClick={() => { onSelect(p.id); setQuery(""); }}
            className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-secondary/80 transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-display text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MatchResultRow({
  result,
  getPlayerById,
  highlight,
}: {
  result: MatchResult;
  getPlayerById: (id: string) => Player | undefined;
  highlight?: "win" | "loss";
}) {
  const partner = getPlayerById(result.partnerId);
  const opp1 = getPlayerById(result.opponentIds[0]);
  const opp2 = getPlayerById(result.opponentIds[1]);
  const colorClass = result.won
    ? "text-win"
    : result.drew
    ? "text-draw"
    : "text-loss";

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50 text-sm">
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">JW{result.matchweek} D{result.division}</span>
        <span className="mx-1.5 text-muted-foreground">·</span>
        <span className="truncate">
          c/ {partner?.name || "?"} vs {opp1?.name || "?"} & {opp2?.name || "?"}
        </span>
      </div>
      <span className={`font-bold font-display ml-2 ${colorClass}`}>
        {result.teamScore}-{result.oppScore}
      </span>
    </div>
  );
}

function PlayerStatsPanel({ stats, getPlayerById }: { stats: PlayerStats; getPlayerById: (id: string) => Player | undefined }) {
  return (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-lg">{stats.player.name}</h3>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Vitórias" value={stats.player.wins} />
        <StatCard label="Empates" value={stats.player.draws} />
        <StatCard label="Derrotas" value={stats.player.losses} />
        <StatCard label="Divisões Jogadas" value={stats.divisionsPlayed.length} />
        <StatCard label="Melhor Divisão" value={stats.highestDivision || "-"} />
        <StatCard label="Pior Divisão" value={stats.lowestDivision || "-"} />
        <StatCard label="Jogos Ganhos" value={stats.player.gamesWon} />
        <StatCard label="Jogos Perdidos" value={stats.player.gamesLost} />
        <StatCard label="Pontos" value={stats.player.points} />
      </div>

      {/* Biggest wins */}
      {stats.biggestWins.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <h4 className="text-sm font-bold text-win mb-2">Maiores Vitórias</h4>
          {stats.biggestWins.map((r, i) => (
            <MatchResultRow key={i} result={r} getPlayerById={getPlayerById} highlight="win" />
          ))}
        </div>
      )}

      {/* Worst losses */}
      {stats.worstLosses.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <h4 className="text-sm font-bold text-loss mb-2">Piores Derrotas</h4>
          {stats.worstLosses.map((r, i) => (
            <MatchResultRow key={i} result={r} getPlayerById={getPlayerById} highlight="loss" />
          ))}
        </div>
      )}

      {/* Best / worst result */}
      <div className="grid grid-cols-2 gap-2">
        {stats.bestResult && (
          <div className="bg-card border border-border rounded-lg p-3">
            <h4 className="text-xs text-muted-foreground mb-1">Melhor Resultado</h4>
            <p className="font-bold font-display text-win text-lg">
              {stats.bestResult.teamScore}-{stats.bestResult.oppScore}
            </p>
            <p className="text-xs text-muted-foreground">JW{stats.bestResult.matchweek} D{stats.bestResult.division}</p>
          </div>
        )}
        {stats.worstResult && (
          <div className="bg-card border border-border rounded-lg p-3">
            <h4 className="text-xs text-muted-foreground mb-1">Pior Resultado</h4>
            <p className="font-bold font-display text-loss text-lg">
              {stats.worstResult.teamScore}-{stats.worstResult.oppScore}
            </p>
            <p className="text-xs text-muted-foreground">JW{stats.worstResult.matchweek} D{stats.worstResult.division}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = {
  player1: "hsl(185, 80%, 50%)", // primary
  player2: "hsl(45, 95%, 55%)",  // accent
};

export function PlayerStatsView() {
  const { state, getPlayerById, getDivisionForPlayer } = useTournament();
  const [player1Id, setPlayer1Id] = useState<string | null>(null);
  const [player2Id, setPlayer2Id] = useState<string | null>(null);

  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => a.name.localeCompare(b.name)),
    [state.players]
  );

  const stats1 = useMemo(
    () => player1Id ? computePlayerStats(player1Id, state.players, state.matches, getDivisionForPlayer) : null,
    [player1Id, state.players, state.matches, getDivisionForPlayer]
  );

  const stats2 = useMemo(
    () => player2Id ? computePlayerStats(player2Id, state.players, state.matches, getDivisionForPlayer) : null,
    [player2Id, state.players, state.matches, getDivisionForPlayer]
  );

  const isComparing = !!stats1 && !!stats2;

  // Build chart data
  const chartData = useMemo(() => {
    if (!stats1) return [];
    const maxMw = Math.max(
      ...stats1.snapshots.map((s) => s.matchweek),
      ...(stats2?.snapshots.map((s) => s.matchweek) || []),
      0
    );
    const data = [];
    for (let mw = 1; mw <= maxMw; mw++) {
      const s1 = stats1.snapshots.find((s) => s.matchweek === mw);
      const s2 = stats2?.snapshots.find((s) => s.matchweek === mw);
      data.push({
        matchweek: `JW${mw}`,
        [`${stats1.player.name} Pts`]: s1?.points || 0,
        [`${stats1.player.name} Pos`]: s1?.position || null,
        ...(stats2
          ? {
              [`${stats2.player.name} Pts`]: s2?.points || 0,
              [`${stats2.player.name} Pos`]: s2?.position || null,
            }
          : {}),
      });
    }
    return data;
  }, [stats1, stats2]);

  const available1 = sortedPlayers.filter((p) => p.id !== player2Id);
  const available2 = sortedPlayers.filter((p) => p.id !== player1Id);

  return (
    <div className="space-y-6">
      {/* Mode indicator */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
          !isComparing
            ? "bg-primary/20 border-primary/50 text-primary"
            : "bg-accent/20 border-accent/50 text-accent"
        }`}>
          {isComparing ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
          {isComparing ? "Comparação" : "Jogador Individual"}
        </div>
      </div>

      {/* Player selectors */}
      <div className={`grid gap-4 ${isComparing || player1Id ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
        <PlayerSelector
          label="Jogador 1"
          selectedId={player1Id}
          onSelect={setPlayer1Id}
          onClear={() => setPlayer1Id(null)}
          players={available1}
        />
        <PlayerSelector
          label="Jogador 2 (comparar)"
          selectedId={player2Id}
          onSelect={setPlayer2Id}
          onClear={() => setPlayer2Id(null)}
          players={available2}
        />
      </div>

      {/* No selection */}
      {!stats1 && !stats2 && (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Seleciona um jogador para ver as estatísticas
        </div>
      )}

      {/* Stats panels */}
      {(stats1 || stats2) && (
        <div className={`grid gap-6 ${isComparing ? "md:grid-cols-2" : ""}`}>
          {stats1 && <PlayerStatsPanel stats={stats1} getPlayerById={getPlayerById} />}
          {stats2 && <PlayerStatsPanel stats={stats2} getPlayerById={getPlayerById} />}
        </div>
      )}

      {/* Charts */}
      {stats1 && chartData.length > 0 && (
        <div className="space-y-4">
          {/* Points evolution */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-display font-bold text-sm mb-4">Evolução de Pontos</h4>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis dataKey="matchweek" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 14%)",
                    border: "1px solid hsl(220, 15%, 22%)",
                    borderRadius: "0.5rem",
                    color: "hsl(210, 20%, 95%)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={`${stats1.player.name} Pts`}
                  stroke={CHART_COLORS.player1}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.player1, r: 3 }}
                />
                {stats2 && (
                  <Line
                    type="monotone"
                    dataKey={`${stats2.player.name} Pts`}
                    stroke={CHART_COLORS.player2}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.player2, r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Position evolution */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-display font-bold text-sm mb-4">Evolução da Posição</h4>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis dataKey="matchweek" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                <YAxis
                  reversed
                  domain={[1, state.players.length || 48]}
                  tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 14%)",
                    border: "1px solid hsl(220, 15%, 22%)",
                    borderRadius: "0.5rem",
                    color: "hsl(210, 20%, 95%)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={`${stats1.player.name} Pos`}
                  stroke={CHART_COLORS.player1}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.player1, r: 3 }}
                />
                {stats2 && (
                  <Line
                    type="monotone"
                    dataKey={`${stats2.player.name} Pos`}
                    stroke={CHART_COLORS.player2}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.player2, r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
