import type { Schemas } from '@/api/v2'

type Round = Schemas['Round']

export default function RoundSelector({ rounds, value, onChange, label = 'Jornada' }: {
  rounds: Round[]
  value: number | null
  onChange: (round: number) => void
  label?: string
}) {
  if (!rounds.length) return null
  const idx = rounds.findIndex((r) => r.number === value)
  const go = (d: number) => {
    const next = rounds[idx + d]
    if (next) onChange(next.number)
  }
  const btn = 'w-[36px] h-[36px] rounded-full border border-gray-300 bg-white text-[18px] disabled:opacity-30'
  return (
    <div className="flex items-center justify-center gap-[12px] my-[12px]">
      <button type="button" className={btn} onClick={() => go(-1)} disabled={idx <= 0} aria-label="Anterior">‹</button>
      <select
        className="text-[15px] font-semibold border border-gray-300 rounded-[8px] px-[10px] py-[6px] bg-white"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {rounds.map((r) => (
          <option key={r.id} value={r.number}>
            {label} {r.number}{r.date ? ` · ${new Date(r.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}` : ''}
          </option>
        ))}
      </select>
      <button type="button" className={btn} onClick={() => go(1)} disabled={idx < 0 || idx >= rounds.length - 1} aria-label="Seguinte">›</button>
    </div>
  )
}
