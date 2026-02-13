import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Player, Match, Division, TournamentState, DIVISION_MULTIPLIERS } from "@/types/tournament";

interface TournamentContextType {
  state: TournamentState;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  calculateDivisions: () => void;
  generateMatchweek: () => void;
  submitResult: (matchId: string, score1: number, score2: number) => void;
  resetTournament: () => void;
  getPlayerById: (id: string) => Player | undefined;
  getDivisionForPlayer: (playerId: string) => number;
  removePlayerFromMatchweek: (playerId: string, matchweek: number) => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

const STORAGE_KEY = "padel-tournament-state";

const defaultState: TournamentState = {
  players: [],
  matches: [],
  currentMatchweek: 0,
  divisions: [],
  matchweekGenerated: false,
};

function loadState(): TournamentState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultState;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TournamentState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getPlayerById = useCallback(
    (id: string) => state.players.find((p) => p.id === id),
    [state.players]
  );

  const getDivisionForPlayer = useCallback(
    (playerId: string) => {
      const div = state.divisions.find((d) => d.playerIds.includes(playerId));
      return div ? div.number : 0;
    },
    [state.divisions]
  );

  const addPlayer = (name: string) => {
    if (state.players.length >= 48) return;
    const player: Player = {
      id: generateId(),
      name,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: 0,
    };
    setState((s) => ({ ...s, players: [...s.players, player] }));
  };

  const removePlayer = (id: string) => {
    setState((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== id),
      divisions: s.divisions.map((d) => ({
        ...d,
        playerIds: d.playerIds.filter((pid) => pid !== id),
      })),
    }));
  };

  const calculateDivisions = () => {
    const sorted = [...state.players].sort((a, b) => b.points - a.points);
    const divisions: Division[] = [];
    for (let i = 0; i < 6; i++) {
      divisions.push({
        number: i + 1,
        playerIds: sorted.slice(i * 8, (i + 1) * 8).map((p) => p.id),
      });
    }
    setState((s) => ({ ...s, divisions, matchweekGenerated: false }));
  };

  const generateMatchweek = () => {
    if (state.divisions.length === 0) return;
    const newMatchweek = state.currentMatchweek + 1;
    const newMatches: Match[] = [];

    state.divisions.forEach((division) => {
      const playerIds = [...division.playerIds];
      // Pair: 1st+8th, 2nd+7th, 3rd+6th, 4th+5th
      const pairs: [string, string][] = [
        [playerIds[0], playerIds[7]],
        [playerIds[1], playerIds[6]],
        [playerIds[2], playerIds[5]],
        [playerIds[3], playerIds[4]],
      ];

      // Each pair plays every other pair = 6 matches per division
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          newMatches.push({
            id: generateId(),
            matchweek: newMatchweek,
            division: division.number,
            team1: pairs[i],
            team2: pairs[j],
            played: false,
          });
        }
      }
    });

    setState((s) => ({
      ...s,
      currentMatchweek: newMatchweek,
      matches: [...s.matches, ...newMatches],
      matchweekGenerated: true,
    }));
  };

  const submitResult = (matchId: string, score1: number, score2: number) => {
    setState((s) => {
      const matchIdx = s.matches.findIndex((m) => m.id === matchId);
      if (matchIdx === -1) return s;
      const match = s.matches[matchIdx];
      if (match.played) return s;

      const multiplier = DIVISION_MULTIPLIERS[match.division] || 1;
      const updatedPlayers = [...s.players];

      const updatePlayer = (id: string, won: boolean, drew: boolean) => {
        const idx = updatedPlayers.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const p = { ...updatedPlayers[idx] };
        p.gamesPlayed += 1;
        if (won) {
          p.wins += 1;
          p.points += 3 * multiplier;
        } else if (drew) {
          p.draws += 1;
          p.points += 1 * multiplier;
        } else {
          p.losses += 1;
        }
        updatedPlayers[idx] = p;
      };

      const team1Won = score1 > score2;
      const isDraw = score1 === score2;
      const removed = match.removedPlayers || [];

      match.team1.forEach((id) => { if (!removed.includes(id)) updatePlayer(id, team1Won, isDraw); });
      match.team2.forEach((id) => { if (!removed.includes(id)) updatePlayer(id, !team1Won && !isDraw, isDraw); });

      const updatedMatches = [...s.matches];
      updatedMatches[matchIdx] = { ...match, score1, score2, played: true };

      return { ...s, players: updatedPlayers, matches: updatedMatches };
    });
  };

  const removePlayerFromMatchweek = (playerId: string, matchweek: number) => {
    setState((s) => ({
      ...s,
      matches: s.matches.map((m) => {
        if (m.matchweek !== matchweek) return m;
        const involves = m.team1.includes(playerId) || m.team2.includes(playerId);
        if (!involves) return m;
        const removed = m.removedPlayers || [];
        if (removed.includes(playerId)) return m;
        return { ...m, removedPlayers: [...removed, playerId] };
      }),
    }));
  };

  const resetTournament = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <TournamentContext.Provider
      value={{
        state,
        addPlayer,
        removePlayer,
        calculateDivisions,
        generateMatchweek,
        submitResult,
        resetTournament,
        getPlayerById,
        getDivisionForPlayer,
        removePlayerFromMatchweek,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within TournamentProvider");
  return ctx;
}
