import { useEffect, useState, useMemo, useCallback } from "react";
import { ShuffleForm } from "@/components/ShuffleForm";
import { PlayerPicker } from "@/components/PlayerPicker";
import { SelectedPlayersList } from "@/components/SelectedPlayersList";
import { CreateShuffleActions } from "@/components/CreateShuffleActions";
import { shuffleTournamentApi } from "@/api/shuffleTournament";
import { playersApi } from "@/api/players";
import { useShuffleForm } from "@/hooks/useShuffleForm";
import { PlayerShort } from "@/types";

export default function CreateShuffleTournamentPage() {
  const {
    form, updateField, selectedPlayers, addPlayer, removePlayer,
    reorderPlayers, clearPlayers, sortPlayersAZ, reversePlayers,
    validationErrors, isValid, buildPayload, reset,
  } = useShuffleForm();

  const [allPlayers, setAllPlayers] = useState<PlayerShort[] | Record<string, unknown>>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setPlayersLoading(true);
    
    playersApi.players_short()
      .then((payload) => { 
        setAllPlayers(payload.data); 
      })
      .finally(() => { setPlayersLoading(false); });
    return () => {};
  }, []);

  const selectedIds = useMemo(() => new Set(selectedPlayers.map((p) => p.id)), [selectedPlayers]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await shuffleTournamentApi.createShuffle(buildPayload());
      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create tournament");
    } finally {
      setIsSubmitting(false);
    }
  }, [buildPayload]);

  const handleReset = useCallback(() => {
    reset();
    setIsSuccess(false);
    setSubmitError(null);
  }, [reset]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#f5f7fb",
        color: "#0f172a",
      }}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-8">
            <div
              className="rounded-xl p-6"
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ee",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
              }}
            >
              <ShuffleForm form={form} updateField={updateField} validationErrors={validationErrors} />
            </div>
            <div
              className="rounded-xl p-6"
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ee",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CreateShuffleActions
                isValid={isValid}
                isSubmitting={isSubmitting}
                isSuccess={isSuccess}
                payload={buildPayload()}
                onSubmit={handleSubmit}
                onReset={handleReset}
                submitError={submitError}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div
              className="rounded-xl p-6"
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ee",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
              }}
            >
              <PlayerPicker
                allPlayers={allPlayers}
                selectedIds={selectedIds}
                maxPlayers={form.maxPlayers}
                selectedCount={selectedPlayers.length}
                onAdd={addPlayer}
                onRemove={removePlayer}
                selectedPlayers={selectedPlayers}
                isLoading={playersLoading}
                error={playersError}
              />
            </div>
            <div
              className="rounded-xl p-6"
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ee",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
              }}
            >
              <SelectedPlayersList
                players={selectedPlayers}
                onReorder={reorderPlayers}
                onRemove={removePlayer}
                onClear={clearPlayers}
                onSortAZ={sortPlayersAZ}
                onReverse={reversePlayers}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
