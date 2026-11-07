import { Icon } from './Icon'
import { Sparkline } from './Sparkline'
import './KpiCard.css'

export function KpiCard({ kpi, style }) {
  const up = kpi.delta >= 0
  return (
    <article className="card kpi" style={style} aria-label={`${kpi.label}: ${kpi.value}, ${up ? 'up' : 'down'} ${Math.abs(kpi.delta)}% ${kpi.note}`}>
      <div className="kpi__body">
        <p className="kpi__label">{kpi.label}</p>
        <p className="kpi__value">{kpi.value}</p>
        <p className="kpi__foot">
          <span className={`trend ${up ? 'up' : 'down'}`}>
            <Icon name={up ? 'trendUp' : 'trendDown'} size={12} stroke={2.4} />
            {up ? '+' : '−'}
            {Math.abs(kpi.delta)}%
          </span>
          <span className="kpi__note">{kpi.note}</span>
        </p>
      </div>
      <Sparkline data={kpi.series} trend={up ? 'up' : 'down'} width={104} height={48} />
    </article>
  )
}
