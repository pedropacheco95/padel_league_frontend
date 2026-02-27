import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DivisionMultipliersEditor } from "./DivisionMultipliersEditor";
import type { ShuffleFormData } from "@/hooks/useShuffleForm";

interface Props {
  form: ShuffleFormData;
  updateField: <K extends keyof ShuffleFormData>(key: K, value: ShuffleFormData[K]) => void;
  validationErrors: Record<string, string>;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 animate-fade-in">{error}</p>;
}

export function ShuffleForm({ form, updateField, validationErrors }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Padel Shuffle"
          className="h-12 bg-white border-slate-300"
        />
        <FieldError error={validationErrors.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="maxPlayers">Max Players</Label>
        <Input
          id="maxPlayers"
          type="number"
          min={1}
          value={form.maxPlayers}
          onChange={(e) => updateField("maxPlayers", Number(e.target.value))}
          className="h-12 bg-white border-slate-300"
        />
        <FieldError error={validationErrors.maxPlayers} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="divisions">Number of Divisions</Label>
        <Input
          id="divisions"
          type="number"
          min={1}
          max={20}
          value={form.numberOfDivisions}
          onChange={(e) => updateField("numberOfDivisions", Math.min(20, Math.max(1, Number(e.target.value))))}
          className="h-12 bg-white border-slate-300"
        />
        <FieldError error={validationErrors.numberOfDivisions} />
      </div>

      <DivisionMultipliersEditor
        numberOfDivisions={form.numberOfDivisions}
        multipliers={form.divisionMultipliers}
        onChange={(m) => updateField("divisionMultipliers", m)}
        errors={validationErrors}
      />
    </div>
  );
}
