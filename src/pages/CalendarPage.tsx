import MonthlyMatchesCalendar from '@/components/MonthlyMatchesCalendar'

export default function CalendarPage() {
  return (
    <div className="l-grid" style={{ marginTop: '2rem' }}>
      <div className="c-tor-header c-tor-header--master" style={{ marginBottom: '1rem' }}>
        <div className="c-tor-header__content" style={{ width: '100%' }}>
          <div className="c-tor-header__title">Calendário</div>
          <div className="c-tor-header__iandt">
            <span>Todos os jogos de todas as divisões</span>
          </div>
        </div>
      </div>
      <MonthlyMatchesCalendar />
    </div>
  )
}
