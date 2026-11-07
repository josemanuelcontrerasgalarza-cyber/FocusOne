import { Icon } from './Icon'
import { Avatar } from './Avatar'
import './Topbar.css'

function greeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 19) return 'Good afternoon'
  return 'Good evening'
}

export function Topbar({ user, theme, onThemeChange }) {
  const now = new Date()
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <header className="topbar">
      <div className="topbar__hello">
        <p className="topbar__date">{today}</p>
        <h1 className="topbar__title">
          {greeting(now)}, {user.firstName}
        </h1>
      </div>

      <div className="topbar__actions">
        <label className="topbar__search">
          <Icon name="search" size={17} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search projects, people…" />
          <kbd>⌘K</kbd>
        </label>

        <div className="theme-switch" role="radiogroup" aria-label="Theme">
          {[
            { id: 'green', label: 'Green' },
            { id: 'blue', label: 'Blue' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              className={`theme-switch__opt theme-switch__opt--${t.id}${theme === t.id ? ' is-on' : ''}`}
              onClick={() => onThemeChange(t.id)}
            >
              <span className="theme-switch__dot" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        <button type="button" className="icon-btn topbar__bell" aria-label="Notifications, 2 unread">
          <Icon name="bell" size={18} />
          <span className="topbar__ping" aria-hidden="true" />
        </button>

        <div className="topbar__me">
          <Avatar name={user.name} hue={user.hue} size={38} ring />
          <div className="topbar__me-text">
            <p className="topbar__me-name">{user.name}</p>
            <p className="topbar__me-role">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
