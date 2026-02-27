import { useState, useCallback, useMemo } from "react";
import type { PlayerDetail, ShufflePayload } from "@/types";

export interface ShuffleFormData {
  title: string;
  maxPlayers: number;
  numberOfDivisions: number;
  divisionMultipliers: Record<string, number>;
}

const DEFAULT_MULTIPLIERS: Record<string, number> = {
  "1": 10, "2": 8, "3": 6, "4": 5, "5": 4, "6": 3,
};

function buildMultipliers(n: number, existing: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 1; i <= n; i++) {
    result[String(i)] = existing[String(i)] ?? Math.max(1, 11 - i * 2);
  }
  return result;
}

export function useShuffleForm() {
  const [form, setForm] = useState<ShuffleFormData>({
    title: "Padel Shuffle",
    maxPlayers: 48,
    numberOfDivisions: 6,
    divisionMultipliers: DEFAULT_MULTIPLIERS,
  });

  const [selectedPlayers, setSelectedPlayers] = useState<PlayerDetail[]>([]);

  const updateField = useCallback(<K extends keyof ShuffleFormData>(key: K, value: ShuffleFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "numberOfDivisions") {
        next.divisionMultipliers = buildMultipliers(value as number, prev.divisionMultipliers);
      }
      return next;
    });
  }, []);

  const addPlayer = useCallback((player: PlayerDetail) => {
    setSelectedPlayers((prev) => {
      if (prev.some((p) => p.id === player.id)) return prev;
      if (prev.length >= form.maxPlayers) return prev;
      return [...prev, player];
    });
  }, [form.maxPlayers]);

  const removePlayer = useCallback((id: number) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reorderPlayers = useCallback((reordered: PlayerDetail[]) => {
    setSelectedPlayers(reordered);
  }, []);

  const clearPlayers = useCallback(() => setSelectedPlayers([]), []);
  const sortPlayersAZ = useCallback(() => {
    setSelectedPlayers((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);
  const reversePlayers = useCallback(() => {
    setSelectedPlayers((prev) => [...prev].reverse());
  }, []);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (form.maxPlayers < 1) errors.maxPlayers = "Must be >= 1";
    if (form.maxPlayers < selectedPlayers.length) errors.maxPlayers = `Must be >= selected players (${selectedPlayers.length})`;
    if (form.numberOfDivisions < 1) errors.numberOfDivisions = "Must be >= 1";

    for (let i = 1; i <= form.numberOfDivisions; i++) {
      const val = form.divisionMultipliers[String(i)];
      if (val === undefined || val === null || isNaN(val) || val < 1) {
        errors[`multiplier_${i}`] = `Division ${i} multiplier must be >= 1`;
      }
    }
    return errors;
  }, [form, selectedPlayers.length]);

  const isValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && selectedPlayers.length > 0;
  }, [validationErrors, selectedPlayers.length]);

  const buildPayload = useCallback((): ShufflePayload => ({
    title: form.title,
    current_matchweek: 1,
    max_players: form.maxPlayers,
    number_of_divisions: form.numberOfDivisions,
    has_ended: false,
    division_multipliers: form.divisionMultipliers,
    players: selectedPlayers.map((p, i) => ({ player_id: p.id, order_index: i + 1 })),
  }), [form, selectedPlayers]);

  const reset = useCallback(() => {
    setForm({
      title: "Padel Shuffle",
      maxPlayers: 48,
      numberOfDivisions: 6,
      divisionMultipliers: DEFAULT_MULTIPLIERS,
    });
    setSelectedPlayers([]);
  }, []);

  return {
    form, updateField, selectedPlayers, addPlayer, removePlayer,
    reorderPlayers, clearPlayers, sortPlayersAZ, reversePlayers,
    validationErrors, isValid, buildPayload, reset,
  };
}
