import { Icon } from './Icon'
import './Sidebar.css'

export function Sidebar({ items, active, onSelect }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__logo" aria-label="Dashboard V22">
        <span>V22</span>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__btn${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => onSelect(item.id)}
            >
              <Icon name={item.icon} size={21} />
              {item.badge ? <span className="sidebar__badge">{item.badge}</span> : null}
              <span className="sidebar__tip" role="tooltip">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      <button type="button" className="sidebar__btn sidebar__btn--muted" aria-label="Log out">
        <Icon name="logout" size={20} />
        <span className="sidebar__tip" role="tooltip">
          Log out
        </span>
      </button>
    </aside>
  )
}
