import { useTournament } from "@/context/TournamentContext";
import { DIVISION_MULTIPLIERS } from "@/types/tournament";

interface StandingsTableProps {
  playerIds?: string[];
  divisionNumber?: number;
  showRank?: boolean;
}

export function StandingsTable({ playerIds, divisionNumber, showRank = true }: StandingsTableProps) {
  const { state, getDivisionForPlayer } = useTournament();

  const players = playerIds
    ? playerIds.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean)
    : [...state.players].sort((a, b) => b.points - a.points);

  const divColor = divisionNumber
    ? `division-${divisionNumber}` : undefined;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {showRank && <th className="py-3 px-3 text-left font-medium w-12">#</th>}
            <th className="py-3 px-3 text-left font-medium">Player</th>
            <th className="py-3 px-2 text-center font-medium w-12">P</th>
            <th className="py-3 px-2 text-center font-medium w-12">W</th>
            <th className="py-3 px-2 text-center font-medium w-12">D</th>
            <th className="py-3 px-2 text-center font-medium w-12">L</th>
            <th className="py-3 px-2 text-center font-medium w-16">Pts</th>
            {!divisionNumber && <th className="py-3 px-2 text-center font-medium w-16">Div</th>}
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => {
            const div = getDivisionForPlayer(player.id);
            const divColorClass = div ? getDivColorClass(div) : "";
            return (
              <tr
                key={player.id}
                className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {showRank && (
                  <td className="py-3 px-3 font-display font-bold text-muted-foreground">
                    {idx + 1}
                  </td>
                )}
                <td className="py-3 px-3 font-medium">{player.name}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{player.gamesPlayed}</td>
                <td className="py-3 px-2 text-center text-win font-medium">{player.wins}</td>
                <td className="py-3 px-2 text-center text-draw font-medium">{player.draws}</td>
                <td className="py-3 px-2 text-center text-loss font-medium">{player.losses}</td>
                <td className="py-3 px-2 text-center font-display font-bold text-primary">
                  {player.points}
                </td>
                {!divisionNumber && div > 0 && (
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${divColorClass}`}>
                      D{div}
                    </span>
                  </td>
                )}
                {!divisionNumber && div === 0 && (
                  <td className="py-3 px-2 text-center text-muted-foreground">-</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getDivColorClass(div: number): string {
  const colors: Record<number, string> = {
    1: "bg-division-1/20 text-division-1",
    2: "bg-division-2/20 text-division-2",
    3: "bg-division-3/20 text-division-3",
    4: "bg-division-4/20 text-division-4",
    5: "bg-division-5/20 text-division-5",
    6: "bg-division-6/20 text-division-6",
  };
  return colors[div] || "";
}
