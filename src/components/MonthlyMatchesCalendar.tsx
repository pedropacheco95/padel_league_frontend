import { useEffect, useMemo, useState } from 'react'
import { calendarApi, CalendarEvent } from '@/api/calendar'

interface Props {
  divisionId?: number
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  })
}

export default function MonthlyMatchesCalendar({ divisionId }: Props) {
  const [month, setMonth] = useState(monthKey(new Date()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedDay(null)
    calendarApi
      .month(month, divisionId)
      .then(({ data }) => setEvents(data.events))
      .finally(() => setLoading(false))
  }, [month, divisionId])

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split('-').map(Number)
    return new Date(year, m, 0).getDate()
  }, [month])

  const startWeekday = useMemo(() => {
    const [year, m] = month.split('-').map(Number)
    const jsDay = new Date(year, m - 1, 1).getDay()
    return jsDay === 0 ? 6 : jsDay - 1
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    events.forEach(ev => {
      if (!ev.dateHour) return
      const day = new Date(ev.dateHour).getDate()
      const current = map.get(day) ?? []
      current.push(ev)
      map.set(day, current)
    })
    return map
  }, [events])

  function changeMonth(offset: number) {
    const [year, m] = month.split('-').map(Number)
    const next = new Date(year, m - 1 + offset, 1)
    setMonth(monthKey(next))
  }

  const selectedDayEvents = selectedDay ? byDay.get(selectedDay) ?? [] : []

  return (
    <div
      style={{
        backgroundColor: '#006A71',
        borderRadius: 10,
        padding: 12,
        border: '1px solid rgba(255, 255, 255, .5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          backgroundColor: '#48A6A7',
          borderRadius: 8,
          padding: '8px 10px',
          border: '1px solid rgba(255, 255, 255, .5)',
        }}
      >
        <button className="c-btn c-btn--small" onClick={() => changeMonth(-1)} style={{ cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ fontWeight: 700, textTransform: 'capitalize', color: 'white' }}>{monthLabel(month)}</div>
        <button className="c-btn c-btn--small" onClick={() => changeMonth(1)} style={{ cursor: 'pointer' }}>
          →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => (
          <div key={label} style={{ fontWeight: 700, fontSize: 12, textAlign: 'center', color: 'white' }}>{label}</div>
        ))}

        {Array.from({ length: startWeekday }).map((_, idx) => (
          <div key={`empty-${idx}`} style={{ minHeight: 84 }} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayEvents = byDay.get(day) ?? []
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                border: '1px solid rgba(255, 255, 255, .5)',
                borderRadius: 8,
                padding: 6,
                minHeight: 84,
                background: selectedDay === day ? '#48A6A7' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'white' }}>{day}</div>
              {dayEvents.slice(0, 2).map(ev => (
                <div
                  key={ev.id}
                  style={{
                    fontSize: 11,
                    marginBottom: 4,
                    lineHeight: 1.2,
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: '1px solid rgba(255, 255, 255, .5)',
                    borderRadius: 6,
                    padding: '4px 5px',
                    color: 'white',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div style={{ fontSize: 11, color: 'white', opacity: 0.8 }}>+{dayEvents.length - 2} jogos</div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay !== null && (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255, 255, 255, .5)',
            borderRadius: 8,
            padding: 10,
            background: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ color: 'white', fontWeight: 700, marginBottom: 8 }}>
            Dia {selectedDay} {monthLabel(month)}
          </div>
          {selectedDayEvents.length === 0 && <div style={{ color: 'white', opacity: 0.8 }}>Sem jogos</div>}
          {selectedDayEvents.map(ev => (
            <a
              key={ev.id}
              href={ev.href}
              style={{
                display: 'block',
                marginBottom: 6,
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, .5)',
                borderRadius: 6,
                padding: '6px 8px',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              {ev.title}
              {ev.played && ` (${ev.gamesHomeTeam}-${ev.gamesAwayTeam})`}
            </a>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, color: 'white' }}>A carregar…</div>
      )}
    </div>
  )
}
