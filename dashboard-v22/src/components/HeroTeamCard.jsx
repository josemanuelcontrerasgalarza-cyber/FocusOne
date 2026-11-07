import { Avatar } from './Avatar'
import { Icon } from './Icon'
import './HeroTeamCard.css'

const STATUS_LABEL = { online: 'Online', away: 'Away', busy: 'In a meeting', offline: 'Offline' }

export function HeroTeamCard({ hero, team, style }) {
  const online = team.filter((m) => m.status === 'online').length
  return (
    <section className="card hero" style={style} aria-labelledby="hero-title">
      <div className="hero__top">
        <div className="hero__copy">
          <p className="hero__eyebrow">
            <span className="hero__eyebrow-dot" aria-hidden="true" />
            {hero.eyebrow} · {online} online now
          </p>
          <h2 id="hero-title" className="hero__title">
            {hero.before}
            <span className="hero__highlight">{hero.highlight}</span>
            {hero.after}
          </h2>
          <p className="hero__sub">{hero.subtitle}</p>
        </div>
        <div className="hero__cta">
          <div className="hero__stack" aria-label={`${team.length} team members`}>
            {team.map((m) => (
              <Avatar key={m.id} name={m.name} hue={m.hue} size={34} ring single />
            ))}
          </div>
          <button type="button" className="hero__invite">
            <Icon name="plus" size={16} stroke={2.2} />
            Invite
          </button>
        </div>
      </div>

      <ul className="hero__team">
        {team.map((m, i) => (
          <li key={m.id} className="member" style={{ '--j': i }}>
            <Avatar name={m.name} hue={m.hue} size={48} status={m.status} />
            <div className="member__text">
              <p className="member__name">{m.name}</p>
              <p className="member__role">{m.role}</p>
            </div>
            <div className="member__progress">
              <div className="member__progress-row">
                <span>This week</span>
                <span className="member__progress-num">
                  {m.done}/{m.goal}
                </span>
              </div>
              <div
                className="member__bar"
                role="progressbar"
                aria-label={`${m.name}: ${m.done} of ${m.goal} tasks this week`}
                aria-valuenow={m.done}
                aria-valuemin={0}
                aria-valuemax={m.goal}
              >
                <span style={{ width: `${Math.round((m.done / m.goal) * 100)}%` }} />
              </div>
            </div>
            <span className={`member__status member__status--${m.status}`}>{STATUS_LABEL[m.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
