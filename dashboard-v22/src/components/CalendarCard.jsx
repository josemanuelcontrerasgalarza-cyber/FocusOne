import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import './CalendarCard.css'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

/** 6×7 grid starting on Monday, with leading/trailing days from adjacent months. */
function buildMonth(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - offset + i)
    cells.push({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), inMonth: d.getMonth() === month })
  }
  // Drop a trailing week made only of next-month days.
  return cells.slice(35).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells
}

export function CalendarCard({ calendar, style }) {
  const now = new Date()
  const todayKey = keyOf(now.getFullYear(), now.getMonth(), now.getDate())
  const [view, setView] = useState({ y: calendar.year, m: calendar.month })
  const [selected, setSelected] = useState(todayKey)
  const cells = useMemo(() => buildMonth(view.y, view.m), [view])
  const title = new Date(view.y, view.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const move = (step) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + step, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const selectedEvent = calendar.events[selected]
  const selectedDate = new Date(`${selected}T12:00:00`)

  return (
    <section className="card cal" style={style} aria-labelledby="cal-title">
      <div className="card-head">
        <div>
          <h2 id="cal-title" className="card-title" aria-live="polite">
            {title}
          </h2>
          <p className="card-sub">{Object.keys(calendar.events).filter((k) => k.startsWith(`${view.y}-${pad(view.m + 1)}`)).length} events this month</p>
        </div>
        <div className="cal__nav">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => move(1)}>
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <div className="cal__grid" role="grid" aria-labelledby="cal-title">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal__wd" role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((c) => {
          const k = keyOf(c.y, c.m, c.d)
          const isToday = k === todayKey
          const isSel = k === selected && !isToday
          const hasEvent = Boolean(calendar.events[k])
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={['cal__day', !c.inMonth && 'is-out', isToday && 'is-today', isSel && 'is-selected'].filter(Boolean).join(' ')}
              aria-label={`${new Date(c.y, c.m, c.d).toDateString()}${hasEvent ? `, ${calendar.events[k]}` : ''}${isToday ? ', today' : ''}`}
              aria-selected={k === selected}
              onClick={() => setSelected(k)}
            >
              {c.d}
              {hasEvent && <span className="cal__dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="cal__agenda">
        <span className="cal__agenda-date">
          <strong>{selectedDate.getDate()}</strong>
          {selectedDate.toLocaleDateString('en-US', { month: 'short' })}
        </span>
        <div className="cal__agenda-text">
          <p className="cal__agenda-title">{selectedEvent ?? 'No events'}</p>
          <p className="cal__agenda-meta">
            {selectedEvent ? '10:00 – 11:00 · Meeting room 2' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
        </div>
      </div>
    </section>
  )
}
