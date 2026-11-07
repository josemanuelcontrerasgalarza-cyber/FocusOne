import { Icon } from './Icon'
import './ProjectsCard.css'

export function ProjectsCard({ projects, style }) {
  return (
    <section className="card projects" style={style} aria-labelledby="projects-title">
      <div className="card-head">
        <div>
          <h2 id="projects-title" className="card-title">
            Last projects
          </h2>
          <p className="card-sub">{projects.length} in progress</p>
        </div>
        <button type="button" className="link-btn">
          See all
        </button>
      </div>

      <ul className="projects__list">
        {projects.map((p, i) => (
          <li key={p.id} className="project">
            <div className={`project__thumb project__thumb--${p.art}`} aria-hidden="true">
              <span className="project__thumb-icon">
                <Icon name={p.icon} size={16} stroke={2} />
              </span>
            </div>
            <div className="project__body">
              <div className="project__row">
                <p className="project__title">{p.title}</p>
                <span className="project__pct">{p.progress}%</span>
              </div>
              <p className="project__meta">{p.meta}</p>
              <div
                className="project__bar"
                role="progressbar"
                aria-label={`${p.title} progress`}
                aria-valuenow={p.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ '--p': `${p.progress}%`, '--k': i }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
