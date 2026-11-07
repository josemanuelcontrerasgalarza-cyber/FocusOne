import './Avatar.css'

/**
 * Initials avatar on a soft two-tone gradient derived from `hue`.
 * No external images, so it renders anywhere (and offline).
 * `single` shows one initial (for overlapping stacks where two would be clipped).
 */
export function Avatar({ name, hue = 160, size = 40, status, ring = false, single = false }) {
  const initials = (single ? name.split(' ').slice(0, 1).join(' ') : name)
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={`avatar${ring ? ' avatar--ring' : ''}`}
      style={{
        '--size': `${size}px`,
        '--h': hue,
      }}
      aria-hidden="true"
    >
      <span className="avatar__face">{initials}</span>
      {status && <span className={`avatar__status avatar__status--${status}`} />}
    </span>
  )
}
