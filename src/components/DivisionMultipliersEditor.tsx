import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  numberOfDivisions: number;
  multipliers: Record<string, number>;
  onChange: (m: Record<string, number>) => void;
  errors: Record<string, string>;
}

export function DivisionMultipliersEditor({
  numberOfDivisions,
  multipliers,
  onChange,
  errors,
}: Props) {
  const [showJson, setShowJson] = useState(false);

  const handleChange = (div: number, val: string) => {
    const num = val === "" ? 0 : Number(val);
    onChange({ ...multipliers, [String(div)]: num });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Division Multipliers</h3>

      <div className="rounded-lg border border-slate-300 overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary/50">
              <th className="px-3 py-2.5 font-medium">Division</th>
              <th className="px-3 py-2.5 font-medium">Multiplier</th>
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: numberOfDivisions }, (_, i) => i + 1).map((div) => (
              <tr key={div} className="border-t border-slate-200">
                <td className="px-3 py-2.5 font-mono">{div}</td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={1}
                    value={multipliers[String(div)] ?? ""}
                    onChange={(e) => handleChange(div, e.target.value)}
                    className="h-11 w-32 bg-white border-slate-300"
                  />
                  {errors[`multiplier_${div}`] && (
                    <p className="mt-0.5">{errors[`multiplier_${div}`]}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setShowJson(!showJson)}
        className="flex items-center gap-1.5 transition-colors"
      >
        {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        JSON Preview
      </button>

      {showJson && (
        <pre className="bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono animate-fade-in">
          {JSON.stringify(multipliers, null, 2)}
        </pre>
      )}
    </div>
  );
}
