export interface SupercupPlayer {
  id: string;
  name: string;
}

export interface SupercupTeam {
  id: string;
  seed: number; // 1..8
  players: [SupercupPlayer, SupercupPlayer];
}

export type SupercupRound = "quarter" | "semi" | "consolation_semi" | "final" | "third" | "fifth" | "seventh";

export interface SupercupMatch {
  id: string;
  round: SupercupRound;
  label: string;
  order: number;
  team1Id: string | null;
  team2Id: string | null;
  score1: number | null;
  score2: number | null;
  played: boolean;
  /** where the winner/loser flows next: matchId + slot */
  winnerTo?: { matchId: string; slot: 1 | 2 };
  loserTo?: { matchId: string; slot: 1 | 2 };
  /** placements awarded by this match: [winnerPlace, loserPlace] */
  places?: [number, number];
}

export interface SupercupState {
  title: string;
  players: SupercupPlayer[];
  teams: SupercupTeam[];
  matches: SupercupMatch[];
  bracketGenerated: boolean;
}

export const SUPERCUP_ROUND_LABELS: Record<SupercupRound, string> = {
  quarter: "Quartos de final",
  semi: "Meias-finais",
  consolation_semi: "Meias-finais de consolação",
  final: "Final",
  third: "3.º e 4.º lugar",
  fifth: "5.º e 6.º lugar",
  seventh: "7.º e 8.º lugar",
};

export const SUPERCUP_MAX_PLAYERS = 16;
