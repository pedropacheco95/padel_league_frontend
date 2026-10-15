import type { Format, StandingRow } from '@/api/v2'
import PlayerAvatar from './PlayerAvatar'
import PointsValue from './PointsValue'

type Col = { key: string; label: string; title: string; value: (r: StandingRow) => React.ReactNode; optional?: boolean }

const n = (v?: number | null) => (v === null || v === undefined ? '—' : v)

export default function StandingsTable({ rows, format = 'classica', highlightPlayerId }: {
  rows: StandingRow[]
  format?: Format
  highlightPlayerId?: number
}) {
  const cols: Col[] = [
    { key: 'pts', label: 'Pts', title: 'Pontos', value: (r) => <PointsValue value={r.points} digits={Number.isInteger(r.points) ? 0 : 1} /> },
    { key: 'p', label: 'P', title: 'Presenças', value: (r) => r.played },
    { key: 'w', label: 'V', title: 'Vitórias', value: (r) => n(r.wins) },
    { key: 'd', label: 'E', title: 'Empates', value: (r) => n(r.draws) },
    { key: 'l', label: 'D', title: 'Derrotas', value: (r) => n(r.losses) },
  ]
  if (format === 'teams') {
    cols.push(
      { key: 'sw', label: 'SG', title: 'Sets ganhos', value: (r) => n(r.setsWon) },
      { key: 'sd', label: 'SE', title: 'Sets empatados', value: (r) => n(r.setsDrawn) },
    )
  }
  if (rows.some((r) => r.gamesWon !== null && r.gamesWon !== undefined)) {
    cols.push(
      { key: 'gw', label: 'JG', title: 'Jogos ganhos', value: (r) => n(r.gamesWon), optional: true },
      { key: 'gl', label: 'JP', title: 'Jogos perdidos', value: (r) => n(r.gamesLost), optional: true },
      { key: 'gd', label: '+/-', title: 'Diferença de jogos', value: (r) => (r.gamesWon === null || r.gamesWon === undefined ? '—' : r.gamesWon - (r.gamesLost ?? 0)), optional: true },
    )
  }
  if (rows.some((r) => r.attendancePct !== null && r.attendancePct !== undefined)) {
    cols.push({ key: 'att', label: '%', title: 'Assiduidade', value: (r) => (r.attendancePct === null || r.attendancePct === undefined ? '—' : `${Math.round(r.attendancePct)}%`), optional: true })
  }
  if (format === 'shuffle' && rows.some((r) => r.nextGroupTier)) {
    cols.push({ key: 'next', label: 'Próx.', title: 'Próximo grupo', value: (r) => n(r.nextGroupTier) })
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-[14px] border-collapse">
        <thead>
          <tr className="text-[12px] text-gray-500 border-b border-gray-200">
            <th className="text-left py-[8px] px-[6px] w-[32px]">#</th>
            <th className="text-left py-[8px] px-[6px]">Jogador</th>
            {cols.map((c) => (
              <th key={c.key} title={c.title} className={`py-[8px] px-[6px] text-center whitespace-nowrap ${c.optional ? 'hidden sm:table-cell' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player.id} className={`border-b border-gray-100 ${r.player.id === highlightPlayerId ? 'bg-teal-50' : ''}`}>
              <td className="py-[8px] px-[6px] font-semibold">{r.place}º</td>
              <td className="py-[8px] px-[6px] max-w-[180px]"><PlayerAvatar player={r.player} size={28} withName /></td>
              {cols.map((c) => (
                <td key={c.key} className={`py-[8px] px-[6px] text-center tabular-nums ${c.key === 'pts' ? 'font-bold' : ''} ${c.optional ? 'hidden sm:table-cell' : ''}`}>{c.value(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
