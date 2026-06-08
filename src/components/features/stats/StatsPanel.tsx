import { Flame, CheckSquare, Trophy, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '../../ui/Card'
import { type Profile } from '../../../types'

interface WeekDay {
  day: string
  tareas: number
}

interface StatsPanelProps {
  user: Profile | null
  weekData: WeekDay[]
  todayCount: number
  bestDay?: string
  loading?: boolean
}

export function StatsPanel({ user, weekData, todayCount, bestDay, loading }: StatsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Cards de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={18} className="text-warning" />
            <span className="text-xs text-text-muted">Racha</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {user?.streak_current ?? 0}
            {(user?.streak_current ?? 0) > 0 && ' 🔥'}
          </p>
          <p className="text-xs text-text-hint mt-0.5">Récord: {user?.streak_best ?? 0}</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={18} className="text-success" />
            <span className="text-xs text-text-muted">Hoy</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{todayCount}</p>
          <p className="text-xs text-text-hint mt-0.5">tareas</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={18} className="text-primary-light" />
            <span className="text-xs text-text-muted">Total</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{user?.tasks_completed_total ?? 0}</p>
          <p className="text-xs text-text-hint mt-0.5">históricas</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-warning" />
            <span className="text-xs text-text-muted">Proyectos</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{user?.projects_completed_total ?? 0}</p>
          <p className="text-xs text-text-hint mt-0.5">completados</p>
        </Card>
      </div>

      {/* Gráfico semanal */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary-light" />
          <h2 className="text-sm font-semibold text-text-primary">Últimos 7 días</h2>
        </div>
        {loading ? (
          <div className="skeleton h-40 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData} barSize={24}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#71717A', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717A', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181B',
                  border: '1px solid #3F3F46',
                  borderRadius: '8px',
                  color: '#FAFAFA',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(124,58,237,0.1)' }}
              />
              <Bar dataKey="tareas" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {bestDay && (
        <Card padding="md">
          <p className="text-sm text-text-muted">🏆 Mejor día registrado</p>
          <p className="text-lg font-bold text-text-primary mt-1 capitalize">{bestDay}</p>
        </Card>
      )}
    </div>
  )
}
