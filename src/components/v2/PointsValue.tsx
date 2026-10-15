// The API sends unrounded numbers; display rounds here (and only here).
export function formatPoints(value?: number | null, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export default function PointsValue({ value, digits = 0, className }: { value?: number | null; digits?: number; className?: string }) {
  return <span className={className} title={value === null || value === undefined ? undefined : String(value)}>{formatPoints(value, digits)}</span>
}
