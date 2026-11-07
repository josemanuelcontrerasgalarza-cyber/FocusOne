import { Icon } from './Icon'
import './PromoCard.css'

/** Illustration placeholder: a glass "crown" badge with orbiting sparkles (inline SVG). */
function PromoArt() {
  return (
    <svg className="promo__art" viewBox="0 0 200 170" aria-hidden="true">
      <defs>
        <linearGradient id="promo-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="promo-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="88" r="70" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
      <circle cx="100" cy="88" r="50" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeDasharray="4 6" />
      <g className="promo__badge">
        <rect x="64" y="52" width="72" height="72" rx="22" fill="url(#promo-badge)" />
        <path d="M80 104h40M82 78l9 8 9-14 9 14 9-8-4 20H86z" fill="url(#promo-crown)" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g className="promo__sparkles" fill="#ffffff">
        <path d="M156 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M40 120l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity="0.8" />
        <circle cx="44" cy="44" r="3" opacity="0.7" />
        <circle cx="166" cy="128" r="2.5" opacity="0.6" />
      </g>
    </svg>
  )
}

export function PromoCard({ promo, style }) {
  return (
    <section className="card promo" style={style} aria-labelledby="promo-title">
      <div className="promo__content">
        <span className="promo__tag">
          <Icon name="sparkle" size={13} stroke={2} />
          Premium
        </span>
        <h2 id="promo-title" className="promo__title">
          {promo.title}
        </h2>
        <p className="promo__text">{promo.text}</p>
        <ul className="promo__features">
          {promo.features.map((f) => (
            <li key={f}>
              <Icon name="check" size={14} stroke={2.4} />
              {f}
            </li>
          ))}
        </ul>
        <div className="promo__buy">
          <button type="button" className="promo__cta">
            {promo.cta}
            <Icon name="arrowUpRight" size={16} stroke={2.2} />
          </button>
          <p className="promo__price">
            <strong>{promo.price}</strong> {promo.period}
          </p>
        </div>
      </div>
      <PromoArt />
    </section>
  )
}
