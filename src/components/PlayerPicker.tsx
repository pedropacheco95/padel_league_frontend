import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PlayerShort } from "@/types";

interface Props {
  // Allow multiple payload shapes from backend/mock
  allPlayers: PlayerShort[] | Record<number, PlayerShort> | Record<string, unknown>;
  selectedIds: Set<number>;
  maxPlayers: number;
  selectedCount: number;
  onAdd: (player: PlayerShort) => void;
  onRemove: (id: number) => void;
  selectedPlayers: PlayerShort[];
  isLoading: boolean;
  error: string | null;
}

export function PlayerPicker({
  allPlayers,
  selectedIds,
  maxPlayers,
  selectedCount,
  onAdd,
  onRemove,
  selectedPlayers,
  isLoading,
  error,
}: Props) {
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const playersArray = useMemo<PlayerShort[]>(() => {
    const normalizePlayer = (value: unknown): PlayerShort | null => {
      if (!value || typeof value !== "object") return null;

      const maybePlayer = (value as { player?: unknown }).player ?? value;
      if (!maybePlayer || typeof maybePlayer !== "object") return null;

      const candidate = maybePlayer as Partial<PlayerShort> & { full_name?: string };
      if (typeof candidate.id !== "number") return null;

      const name =
        typeof candidate.name === "string"
          ? candidate.name
          : typeof candidate.fullName === "string"
            ? candidate.fullName
            : typeof candidate.full_name === "string"
              ? candidate.full_name
              : null;

      if (!name) return null;

      return {
        id: candidate.id,
        name,
        fullName: candidate.fullName ?? name,
        pictureUrl: candidate.pictureUrl ?? null,
        rankingPoints: candidate.rankingPoints ?? 0,
      };
    };

    const raw = Array.isArray(allPlayers)
      ? allPlayers
      : Array.isArray((allPlayers as { players?: unknown[] })?.players)
        ? ((allPlayers as { players: unknown[] }).players ?? [])
        : Object.values(allPlayers ?? {});

    return raw
      .map(normalizePlayer)
      .filter((p): p is PlayerShort => Boolean(p));
  }, [allPlayers]);

  const filtered = useMemo<PlayerShort[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return playersArray;
    return playersArray.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [playersArray, query]);
  
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const atCapacity = selectedCount >= maxPlayers;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const player = filtered[highlightIdx];
      if (player && !selectedIds.has(player.id) && !atCapacity) onAdd(player);
      return;
    }

    if (e.key === "Backspace" && query === "" && selectedPlayers.length > 0) {
      onRemove(selectedPlayers[selectedPlayers.length - 1].id);
    }
  };

  return (
    <div className="space-y-4" style={{ color: "#0f172a" }}>
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">Players</h2>
        <span className="font-mono">{selectedCount} / {maxPlayers}</span>
      </div>

      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPlayers.map((p) => (
            <span
              key={`${p.id}-${p.name}`}
              className="inline-flex items-center gap-1 bg-primary/15 font-medium px-2.5 py-1.5 rounded-full animate-fade-in"
            >
              {p.name}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search players..."
          className="pl-10 h-12 bg-white border-slate-300"
        />
      </div>

      {atCapacity && (
        <div className="flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          Maximum players reached
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 rounded-md px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div
        ref={listRef}
        className="max-h-72 overflow-y-auto rounded-lg border border-slate-300 divide-y divide-slate-200 bg-white"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-3 py-2.5 animate-pulse">
              <div className="h-4 bg-secondary rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6">No players found</div>
        ) : (
          filtered.map((player, idx) => {
            const isSelected = selectedIds.has(player.id);
            const isHighlighted = idx === highlightIdx;

            return (
              <button
                key={`${player.id}-${idx}`}
                type="button"
                disabled={isSelected || atCapacity}
                onClick={() => onAdd(player)}
                className={`w-full text-left px-3 py-3.5 transition-colors flex items-center justify-between ${
                  isSelected ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"
                } ${isHighlighted && !isSelected ? "bg-slate-100" : ""}`}
                style={{ color: "#0f172a" }}
              >
                <span>{player.name}</span>

                {player.rankingPoints !== undefined && (
                  <span className="font-mono">{player.rankingPoints}</span>
                )}

                {isSelected && <span>✓</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
