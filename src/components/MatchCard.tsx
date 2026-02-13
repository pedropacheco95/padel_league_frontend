import { useState } from "react";
import { useTournament } from "@/context/TournamentContext";
import { DIVISION_MULTIPLIERS } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, UserMinus } from "lucide-react";

export function MatchCard({ matchId, gameNumber }: { matchId: string; gameNumber?: number }) {
  const { state, getPlayerById, submitResult, removePlayerFromMatchweek } = useTournament();
  const match = state.matches.find((m) => m.id === matchId);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");

  if (!match) return null;

  const t1Names = match.team1.map((id) => getPlayerById(id)?.name || "?");
  const t2Names = match.team2.map((id) => getPlayerById(id)?.name || "?");
  const mult = DIVISION_MULTIPLIERS[match.division] || 1;

  const handleSubmit = () => {
    const score1 = parseInt(s1);
    const score2 = parseInt(s2);
    if (isNaN(score1) || isNaN(score2)) return;
    submitResult(match.id, score1, score2);
  };

  const handleRemovePlayer = (playerId: string) => {
    if (playerId === "?" || match.played) return;
    const player = getPlayerById(playerId);
    if (!player) return;
    if (confirm(`Remove ${player.name} from all matchweek ${match.matchweek} games?`)) {
      removePlayerFromMatchweek(playerId, match.matchweek);
    }
  };

  const divColorClass = getDivBorderClass(match.division);

  const PlayerName = ({ id, name }: { id: string; name: string }) => (
    <span className="inline-flex items-center gap-1 group">
      <span className="text-sm font-medium">{name}</span>
      {!match.played && id !== "?" && (
        <button
          onClick={() => handleRemovePlayer(id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          title={`Remove ${name} from matchweek`}
        >
          <UserMinus className="h-3 w-3" />
        </button>
      )}
    </span>
  );

  return (
    <div className={`rounded-lg bg-card border ${divColorClass} p-4 animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {gameNumber ? `Game ${gameNumber} · ` : ""}Division {match.division} · ×{mult}
        </span>
        {match.played && (
          <span className="text-xs px-2 py-0.5 rounded bg-win/20 text-win font-medium">
            Completed
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-right space-y-0.5">
          <PlayerName id={match.team1[0]} name={t1Names[0]} />
          <br />
          <PlayerName id={match.team1[1]} name={t1Names[1]} />
        </div>

        {match.played ? (
          <div className="flex items-center gap-2 px-3">
            <span className="font-display font-bold text-xl text-foreground">{match.score1}</span>
            <span className="text-muted-foreground text-xs">-</span>
            <span className="font-display font-bold text-xl text-foreground">{match.score2}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              className="w-12 text-center h-9 bg-secondary border-border"
              value={s1}
              onChange={(e) => setS1(e.target.value)}
              placeholder="0"
            />
            <span className="text-muted-foreground text-xs px-1">-</span>
            <Input
              className="w-12 text-center h-9 bg-secondary border-border"
              value={s2}
              onChange={(e) => setS2(e.target.value)}
              placeholder="0"
            />
            <Button size="icon" variant="ghost" className="h-9 w-9 text-primary hover:bg-primary/10" onClick={handleSubmit}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 text-left space-y-0.5">
          <PlayerName id={match.team2[0]} name={t2Names[0]} />
          <br />
          <PlayerName id={match.team2[1]} name={t2Names[1]} />
        </div>
      </div>
    </div>
  );
}

function getDivBorderClass(div: number): string {
  const m: Record<number, string> = {
    1: "border-division-1/30",
    2: "border-division-2/30",
    3: "border-division-3/30",
    4: "border-division-4/30",
    5: "border-division-5/30",
    6: "border-division-6/30",
  };
  return m[div] || "border-border";
}
