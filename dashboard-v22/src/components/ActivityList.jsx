import { useState } from 'react'
import { Avatar } from './Avatar'
import './ActivityList.css'

export function ActivityList({ items, style }) {
  const [read, setRead] = useState(() => new Set(items.filter((a) => !a.unread).map((a) => a.id)))
  const unread = items.filter((a) => !read.has(a.id)).length

  return (
    <section className="card activity" style={style} aria-labelledby="activity-title">
      <div className="card-head">
        <div>
          <h2 id="activity-title" className="card-title">
            Activity
            {unread > 0 && <span className="activity__count">{unread} new</span>}
          </h2>
          <p className="card-sub">What your team did today</p>
        </div>
        <button
          type="button"
          className="link-btn"
          disabled={unread === 0}
          onClick={() => setRead(new Set(items.map((a) => a.id)))}
        >
          Mark all as read
        </button>
      </div>

      <ul className="activity__list">
        {items.map((a) => {
          const isUnread = !read.has(a.id)
          return (
            <li key={a.id}>
              <button
                type="button"
                className={`activity__item${isUnread ? ' is-unread' : ''}`}
                onClick={() => setRead((s) => new Set(s).add(a.id))}
              >
                <Avatar name={a.who} hue={a.hue} size={40} />
                <span className="activity__text">
                  <span className="activity__msg">
                    <strong>{a.who}</strong> {a.text}
                  </span>
                  <span className="activity__time">{a.time}</span>
                </span>
                {isUnread && <span className="activity__dot" aria-label="Unread" />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
