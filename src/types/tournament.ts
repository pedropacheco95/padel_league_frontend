export interface Player {
  id: string;
  name: string;
  fullName?: string;
  pictureUrl?: string | null;
  rankingPoints?: number;
  position?: number;
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

export interface ShuffleTournamentDetail {
  id: number;
  title: string;
  currentMatchweek: number;
  maxPlayers: number;
  players: Player[];
  matches: Match[];
  divisions: Division[];
  divisionMultipliers: Record<number, number>;
}

export interface PlayerComparisonMatchResult {
  matchweek: number;
  division: number;
  partnerId: string;
  opponentIds: [string, string];
  teamScore: number;
  oppScore: number;
  won: boolean;
  drew: boolean;
}

export interface PlayerComparisonSnapshot {
  matchweek: number;
  points: number;
  position: number;
}

export interface PlayerComparisonStats {
  player: Player;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  totalGames: number;
  points: number;
  bestWinDiff: number;
  worstLossDiff: number;
  currentStreak: { type: "W" | "D" | "L"; count: number };
  divisionsPlayed: number[];
  highestDivision: number;
  lowestDivision: number;
  biggestWins: PlayerComparisonMatchResult[];
  worstLosses: PlayerComparisonMatchResult[];
  avgPointsPerMatchweek: number;
  snapshots: PlayerComparisonSnapshot[];
}

export interface PlayerComparisonHeadToHeadResult {
  matchId: number;
  source: "shuffle" | "league";
  sourceLabel: string;
  matchweek: number;
  division: number;
  divisionLabel?: string | null;
  p1PartnerId: string;
  p1PartnerName?: string | null;
  p2PartnerId: string;
  p2PartnerName?: string | null;
  p1Score: number;
  p2Score: number;
  winner: "p1" | "p2" | "draw";
}

export interface PlayerComparisonHeadToHeadTotals {
  total: number;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  p1Losses: number;
  p2Losses: number;
}

export interface PlayerComparisonResponse {
  tournamentId: number;
  totalPlayers: number;
  player1: PlayerComparisonStats;
  player2: PlayerComparisonStats;
  headToHead: PlayerComparisonHeadToHeadResult[];
  headToHeadTotals?: PlayerComparisonHeadToHeadTotals;
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
