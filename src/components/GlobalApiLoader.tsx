import { useSyncExternalStore } from "react";
import { getApiLoadingState, subscribeToApiLoading } from "@/api/client";

export default function GlobalApiLoader() {
  const isLoading = useSyncExternalStore(
    subscribeToApiLoading,
    getApiLoadingState,
    getApiLoadingState
  );

  if (!isLoading) return null;

  return (
    <div className="c-api-loading-screen" aria-live="polite" aria-busy="true">
      <div className="loader"></div>
    </div>
  );
}
