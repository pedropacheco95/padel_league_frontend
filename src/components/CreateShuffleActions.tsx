import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { ShufflePayload } from "@/types";

interface Props {
  isValid: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  payload: ShufflePayload;
  onSubmit: () => void;
  onReset: () => void;
  submitError: string | null;
}

export function CreateShuffleActions({
  isValid,
  isSubmitting,
  isSuccess,
  payload,
  onSubmit,
  onReset,
  submitError,
}: Props) {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <div className="space-y-4">
      {submitError && (
        <div className="bg-destructive/10 rounded-md px-3 py-2.5 animate-fade-in">
          {submitError}
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-2 bg-success/10 rounded-md px-3 py-2.5 animate-fade-in">
          <Check className="w-4 h-4" />
          Tournament created successfully!
        </div>
      )}

      <div className="flex gap-3">
        {isSuccess ? (
          <Button onClick={onReset} className="gap-2 h-11">
            <RotateCcw className="w-4 h-4" /> Create Another
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={!isValid || isSubmitting} className="gap-2 glow-primary-strong h-11">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Shuffle
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowPayload(!showPayload)}
        className="flex items-center gap-1.5 transition-colors"
      >
        {showPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Payload Preview
      </button>

      {showPayload && (
        <pre className="bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono animate-fade-in max-h-80 overflow-y-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
