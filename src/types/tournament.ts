export interface Player {
  id: string;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}

export interface Match {
  id: string;
  matchweek: number;
  division: number;
  team1: [string, string]; // player IDs
  team2: [string, string]; // player IDs
  score1?: number;
  score2?: number;
  played: boolean;
  removedPlayers?: string[]; // player IDs removed from this match (no points)
}

export interface Division {
  number: number;
  playerIds: string[];
}

export interface TournamentState {
  players: Player[];
  matches: Match[];
  currentMatchweek: number;
  divisions: Division[];
  matchweekGenerated: boolean;
}

export const DIVISION_MULTIPLIERS: Record<number, number> = {
  1: 10,
  2: 8,
  3: 6,
  4: 4,
  5: 2,
  6: 1,
};

export const DIVISION_COLORS: Record<number, string> = {
  1: "division-1",
  2: "division-2",
  3: "division-3",
  4: "division-4",
  5: "division-5",
  6: "division-6",
};
