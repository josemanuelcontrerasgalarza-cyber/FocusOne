import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { HeroTeamCard } from './components/HeroTeamCard'
import { CalendarCard } from './components/CalendarCard'
import { KpiCard } from './components/KpiCard'
import { ChartCard } from './components/ChartCard'
import { ProjectsCard } from './components/ProjectsCard'
import { ActivityList } from './components/ActivityList'
import { PromoCard } from './components/PromoCard'
import { activity, analytics, calendar, hero, kpis, navItems, projects, promo, team, user } from './data'
import './App.css'

const THEME_KEY = 'dashboard-v22:theme'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'blue' ? 'blue' : 'green'
    } catch {
      return 'green'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
  }, [theme])
  return [theme, setTheme]
}

// `--i` drives the staggered entrance (index × 70ms).
const order = (i) => ({ '--i': i })

export default function App() {
  const [theme, setTheme] = useTheme()
  const [nav, setNav] = useState('home')

  return (
    <div className="app">
      <Sidebar items={navItems} active={nav} onSelect={setNav} />

      <main className="main">
        <Topbar user={user} theme={theme} onThemeChange={setTheme} />

        <div className="grid">
          {/* Top row */}
          <HeroTeamCard hero={hero} team={team} style={order(0)} />
          <CalendarCard calendar={calendar} style={order(1)} />

          {/* Middle row */}
          <div className="grid__kpis">
            {kpis.map((k, i) => (
              <KpiCard key={k.id} kpi={k} style={order(2 + i)} />
            ))}
          </div>
          <ChartCard analytics={analytics} style={order(5)} />
          <ProjectsCard projects={projects} style={order(6)} />

          {/* Bottom row */}
          <ActivityList items={activity} style={order(7)} />
          <PromoCard promo={promo} style={order(8)} />
        </div>
      </main>
    </div>
  )
}
