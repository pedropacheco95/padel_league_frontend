import { useTournament } from "@/context/TournamentContext";
import { StandingsTable } from "@/components/StandingsTable";
import { DIVISION_MULTIPLIERS } from "@/types/tournament";

interface DivisionViewProps {
  divisionNumber: number;
}

export function DivisionView({ divisionNumber }: DivisionViewProps) {
  const { state } = useTournament();
  const division = state.divisions.find((d) => d.number === divisionNumber);

  if (!division) return null;

  const multiplier = DIVISION_MULTIPLIERS[divisionNumber] || 1;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">Division {divisionNumber}</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Win: <strong className="text-win">{3 * multiplier} pts</strong></span>
          <span>Draw: <strong className="text-draw">{1 * multiplier} pts</strong></span>
        </div>
      </div>
      <StandingsTable playerIds={division.playerIds} divisionNumber={divisionNumber} />
    </div>
  );
}
