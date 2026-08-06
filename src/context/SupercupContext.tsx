import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  SupercupMatch,
  SupercupPlayer,
  SupercupState,
  SupercupTeam,
  SUPERCUP_MAX_PLAYERS,
} from "@/types/supercup";

const STORAGE_KEY = "padel-supercup-state";

const defaultState: SupercupState = {
  title: "Padel Supercup",
  players: [],
  teams: [],
  matches: [],
  bracketGenerated: false,
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function loadState(): SupercupState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch {
    /* ignore */
  }
  return defaultState;
}

function buildTeams(players: SupercupPlayer[], randomize: boolean): SupercupTeam[] {
  const pool = randomize ? [...players].sort(() => Math.random() - 0.5) : [...players];
  const teams: SupercupTeam[] = [];
  for (let i = 0; i < pool.length - 1; i += 2) {
    teams.push({
      id: generateId(),
      seed: teams.length + 1,
      players: [pool[i], pool[i + 1]],
    });
  }
  return teams;
}

/**
 * 8 teams, 3 games each:
 * QF (4) -> winners semis (2) + consolation semis (2) -> final, 3rd, 5th, 7th place games
 */
function buildBracket(teams: SupercupTeam[]): SupercupMatch[] {
  const ids = {
    qf: [generateId(), generateId(), generateId(), generateId()],
    sf: [generateId(), generateId()],
    cs: [generateId(), generateId()],
    final: generateId(),
    third: generateId(),
    fifth: generateId(),
    seventh: generateId(),
  };

  const empty = {
    score1: null,
    score2: null,
    played: false,
  };

  const matches: SupercupMatch[] = [
    // Quarter finals: 1v8, 2v7, 3v6, 4v5
    ...([
      [0, 7],
      [1, 6],
      [2, 5],
      [3, 4],
    ] as [number, number][]).map(([a, b], i) => ({
      id: ids.qf[i],
      round: "quarter" as const,
      label: `Quartos ${i + 1}`,
      order: i + 1,
      team1Id: teams[a]?.id ?? null,
      team2Id: teams[b]?.id ?? null,
      winnerTo: { matchId: ids.sf[i < 2 ? 0 : 1], slot: (i % 2 === 0 ? 1 : 2) as 1 | 2 },
      loserTo: { matchId: ids.cs[i < 2 ? 0 : 1], slot: (i % 2 === 0 ? 1 : 2) as 1 | 2 },
      ...empty,
    })),

    // Winners semis
    ...ids.sf.map((id, i) => ({
      id,
      round: "semi" as const,
      label: `Meia-final ${i + 1}`,
      order: 5 + i,
      team1Id: null,
      team2Id: null,
      winnerTo: { matchId: ids.final, slot: (i === 0 ? 1 : 2) as 1 | 2 },
      loserTo: { matchId: ids.third, slot: (i === 0 ? 1 : 2) as 1 | 2 },
      ...empty,
    })),

    // Consolation semis
    ...ids.cs.map((id, i) => ({
      id,
      round: "consolation_semi" as const,
      label: `Consolação ${i + 1}`,
      order: 7 + i,
      team1Id: null,
      team2Id: null,
      winnerTo: { matchId: ids.fifth, slot: (i === 0 ? 1 : 2) as 1 | 2 },
      loserTo: { matchId: ids.seventh, slot: (i === 0 ? 1 : 2) as 1 | 2 },
      ...empty,
    })),

    // Placement games
    {
      id: ids.final,
      round: "final",
      label: "Final",
      order: 9,
      team1Id: null,
      team2Id: null,
      places: [1, 2],
      ...empty,
    },
    {
      id: ids.third,
      round: "third",
      label: "3.º lugar",
      order: 10,
      team1Id: null,
      team2Id: null,
      places: [3, 4],
      ...empty,
    },
    {
      id: ids.fifth,
      round: "fifth",
      label: "5.º lugar",
      order: 11,
      team1Id: null,
      team2Id: null,
      places: [5, 6],
      ...empty,
    },
    {
      id: ids.seventh,
      round: "seventh",
      label: "7.º lugar",
      order: 12,
      team1Id: null,
      team2Id: null,
      places: [7, 8],
      ...empty,
    },
  ];

  return matches;
}

function propagate(matches: SupercupMatch[]): SupercupMatch[] {
  const byId = new Map(matches.map(m => [m.id, { ...m }]));

  // clear downstream slots first, then fill from played results
  const fedSlots = new Set<string>();
  byId.forEach(m => {
    if (m.winnerTo) fedSlots.add(`${m.winnerTo.matchId}:${m.winnerTo.slot}`);
    if (m.loserTo) fedSlots.add(`${m.loserTo.matchId}:${m.loserTo.slot}`);
  });
  fedSlots.forEach(key => {
    const [matchId, slot] = key.split(":");
    const target = byId.get(matchId);
    if (!target) return;
    if (slot === "1") target.team1Id = null;
    else target.team2Id = null;
  });

  const ordered = Array.from(byId.values()).sort((a, b) => a.order - b.order);
  ordered.forEach(match => {
    const current = byId.get(match.id)!;
    if (!current.played || current.score1 == null || current.score2 == null) return;
    if (!current.team1Id || !current.team2Id) return;
    const winner = current.score1 >= current.score2 ? current.team1Id : current.team2Id;
    const loser = winner === current.team1Id ? current.team2Id : current.team1Id;

    const assign = (dest: { matchId: string; slot: 1 | 2 } | undefined, teamId: string) => {
      if (!dest) return;
      const target = byId.get(dest.matchId);
      if (!target) return;
      if (dest.slot === 1) target.team1Id = teamId;
      else target.team2Id = teamId;
    };
    assign(current.winnerTo, winner);
    assign(current.loserTo, loser);
  });

  return Array.from(byId.values()).sort((a, b) => a.order - b.order);
}

interface SupercupContextType {
  state: SupercupState;
  setTitle: (title: string) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  buildTeamsFromPlayers: (randomize: boolean) => void;
  generateBracket: () => void;
  setResult: (matchId: string, score1: number, score2: number) => void;
  clearResult: (matchId: string) => void;
  resetSupercup: () => void;
  getTeamById: (id: string | null) => SupercupTeam | undefined;
  getPlacements: () => { place: number; team: SupercupTeam }[];
}

const SupercupContext = createContext<SupercupContextType | null>(null);

export function SupercupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SupercupState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setTitle = useCallback((title: string) => setState(s => ({ ...s, title })), []);

  const addPlayer = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState(s => {
      if (s.players.length >= SUPERCUP_MAX_PLAYERS) return s;
      return { ...s, players: [...s.players, { id: generateId(), name: trimmed }] };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }, []);

  const buildTeamsFromPlayers = useCallback((randomize: boolean) => {
    setState(s => {
      if (s.players.length !== SUPERCUP_MAX_PLAYERS) return s;
      return { ...s, teams: buildTeams(s.players, randomize), matches: [], bracketGenerated: false };
    });
  }, []);

  const generateBracket = useCallback(() => {
    setState(s => {
      if (s.teams.length !== 8) return s;
      return { ...s, matches: buildBracket(s.teams), bracketGenerated: true };
    });
  }, []);

  const setResult = useCallback((matchId: string, score1: number, score2: number) => {
    setState(s => {
      const matches = s.matches.map(m =>
        m.id === matchId ? { ...m, score1, score2, played: true } : m
      );
      return { ...s, matches: propagate(matches) };
    });
  }, []);

  const clearResult = useCallback((matchId: string) => {
    setState(s => {
      const matches = s.matches.map(m =>
        m.id === matchId ? { ...m, score1: null, score2: null, played: false } : m
      );
      return { ...s, matches: propagate(matches) };
    });
  }, []);

  const resetSupercup = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getTeamById = useCallback(
    (id: string | null) => (id ? state.teams.find(t => t.id === id) : undefined),
    [state.teams]
  );

  const getPlacements = useCallback(() => {
    const result: { place: number; team: SupercupTeam }[] = [];
    state.matches.forEach(m => {
      if (!m.places || !m.played || m.score1 == null || m.score2 == null) return;
      if (!m.team1Id || !m.team2Id) return;
      const winnerId = m.score1 >= m.score2 ? m.team1Id : m.team2Id;
      const loserId = winnerId === m.team1Id ? m.team2Id : m.team1Id;
      const winner = state.teams.find(t => t.id === winnerId);
      const loser = state.teams.find(t => t.id === loserId);
      if (winner) result.push({ place: m.places[0], team: winner });
      if (loser) result.push({ place: m.places[1], team: loser });
    });
    return result.sort((a, b) => a.place - b.place);
  }, [state.matches, state.teams]);

  return (
    <SupercupContext.Provider
      value={{
        state,
        setTitle,
        addPlayer,
        removePlayer,
        buildTeamsFromPlayers,
        generateBracket,
        setResult,
        clearResult,
        resetSupercup,
        getTeamById,
        getPlacements,
      }}
    >
      {children}
    </SupercupContext.Provider>
  );
}

export function useSupercup() {
  const ctx = useContext(SupercupContext);
  if (!ctx) throw new Error("useSupercup must be used within SupercupProvider");
  return ctx;
}
