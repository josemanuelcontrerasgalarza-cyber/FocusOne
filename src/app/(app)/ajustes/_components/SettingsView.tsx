'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Trash2, LogOut, Keyboard, Volume2, Cloud, HardDrive, Check } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useAuthStore } from '@/store/authStore'
import { useUI } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Field, PageHeader, Segmented, Switch } from '@/components/ui/primitives'
import { confirm } from '@/components/ui/Overlay'
import { toast } from '@/lib/toast'
import { APP_VERSION } from '@/lib/changelog'
import type { KairoSettings } from '@/lib/kairo/types'

/** Tono suave generado (sin archivos de audio) para probar el volumen. */
export function playChime(volume: number) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    for (const [i, f] of [660, 880].entries()) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, now + i * 0.18)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.25 * volume), now + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.6)
      o.connect(g).connect(ctx.destination)
      o.start(now + i * 0.18)
      o.stop(now + i * 0.18 + 0.65)
    }
    setTimeout(() => void ctx.close(), 1200)
  } catch {
    /* sin soporte de audio */
  }
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 grid gap-4 border-t border-line py-7 first:border-0 first:pt-2 md:grid-cols-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-dim">{description}</p>}
      </div>
      <div className="space-y-4 md:col-span-2">{children}</div>
    </section>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onCommit,
  id,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onCommit: (n: number) => void
  id: string
}) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const n = Number(draft)
    if (!Number.isFinite(n) || n < min || n > max) {
      setError(`Entre ${min} y ${max}.`)
      return
    }
    setError(null)
    if (Math.round(n) !== value) onCommit(Math.round(n))
  }
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-invalid={Boolean(error)}
          className="k-input w-24 font-mono"
        />
        <span className="text-sm text-ink-dim">{suffix}</span>
      </div>
    </Field>
  )
}

export function SettingsView() {
  const router = useRouter()
  const ws = useWorkspace()
  const { settings, profile, mode, updateSettings } = ws
  const { session, signOut } = useAuthStore()
  const setShortcuts = useUI((s) => s.setShortcuts)
  const [name, setName] = useState(profile?.name ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => setName(profile?.name ?? ''), [profile?.name])

  const setFocus = (patch: Partial<KairoSettings['focus']>) => updateSettings({ focus: patch })

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('El nombre no puede estar vacío.')
    if (await ws.setName(name)) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function exportData() {
    const s = useWorkspace.getState()
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'Kairo',
            version: APP_VERSION,
            exported_at: new Date().toISOString(),
            profile: s.profile,
            settings: s.settings,
            tasks: s.tasks,
            projects: s.projects,
            goals: s.goals,
            habits: s.habits,
            habit_logs: s.habitLogs,
            focus_sessions: s.sessions,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kairo-datos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Datos exportados')
  }

  async function resetAll() {
    const ok = await confirm({
      title: '¿Borrar todos tus datos de productividad?',
      description: 'Se eliminarán tareas, proyectos, objetivos, hábitos y sesiones de enfoque. Tu cuenta, amigos y recompensas se conservan. No se puede deshacer.',
      confirmLabel: 'Continuar',
      destructive: true,
    })
    if (!ok) return
    const sure = await confirm({
      title: 'Última confirmación',
      description: 'Te recomendamos exportar tus datos antes. ¿Borrar definitivamente?',
      confirmLabel: 'Borrar definitivamente',
      destructive: true,
    })
    if (sure && (await ws.resetProductivity())) toast.success('Datos de productividad borrados')
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Ajustes" description="Kairo se adapta a tu forma de trabajar. Los cambios se guardan solos." />

      <nav aria-label="Secciones de ajustes" className="mt-6 flex gap-1 overflow-x-auto text-[13px]">
        {[
          ['perfil', 'Perfil'],
          ['apariencia', 'Apariencia'],
          ['enfoque', 'Enfoque'],
          ['sonido', 'Sonido'],
          ['metas', 'Metas diarias'],
          ['notificaciones', 'Notificaciones'],
          ['atajos', 'Atajos'],
          ['privacidad', 'Privacidad'],
        ].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-control px-2.5 py-1.5 text-ink-dim hover:bg-sunken hover:text-ink">
            {l}
          </a>
        ))}
      </nav>

      <Card className="mt-4 px-5 sm:px-7">
        <Section id="perfil" title="Perfil" description="Cómo te saluda Kairo.">
          <form onSubmit={saveName} className="flex flex-wrap items-end gap-2">
            <Field label="Nombre" htmlFor="s-name" className="min-w-[220px] flex-1">
              <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="k-input" autoComplete="name" />
            </Field>
            <Button type="submit" icon={saved ? <Check size={14} /> : undefined} disabled={!name.trim() || name.trim() === (profile?.name ?? '')}>
              {saved ? 'Guardado' : 'Guardar'}
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-dim">
            {profile?.email && <span>{profile.email}</span>}
            {mode === 'cloud' ? (
              <Badge tone="success">
                <Cloud size={11} /> Sincronizado en la nube
              </Badge>
            ) : (
              <Badge tone="warm">
                <HardDrive size={11} /> Solo en este navegador
              </Badge>
            )}
          </div>
        </Section>

        <Section id="apariencia" title="Apariencia" description="Claro, oscuro o el de tu sistema.">
          <Segmented
            label="Tema"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
        </Section>

        <Section id="enfoque" title="Enfoque" description="Duraciones del ciclo Pomodoro y comportamiento de los descansos.">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="f-focus" label="Sesión de enfoque" value={settings.focus.focusMinutes} min={5} max={180} suffix="min" onCommit={(n) => setFocus({ focusMinutes: n })} />
            <NumberField id="f-short" label="Descanso corto" value={settings.focus.shortBreakMinutes} min={1} max={30} suffix="min" onCommit={(n) => setFocus({ shortBreakMinutes: n })} />
            <NumberField id="f-long" label="Descanso largo" value={settings.focus.longBreakMinutes} min={5} max={60} suffix="min" onCommit={(n) => setFocus({ longBreakMinutes: n })} />
            <NumberField id="f-every" label="Descanso largo cada" value={settings.focus.longBreakEvery} min={2} max={8} suffix="sesiones" onCommit={(n) => setFocus({ longBreakEvery: n })} />
          </div>
          <Switch id="f-auto-break" label="Empezar los descansos automáticamente" checked={settings.focus.autoStartBreaks} onChange={(v) => setFocus({ autoStartBreaks: v })} />
          <Switch id="f-auto-focus" label="Empezar la siguiente sesión tras el descanso" checked={settings.focus.autoStartFocus} onChange={(v) => setFocus({ autoStartFocus: v })} />
        </Section>

        <Section id="sonido" title="Sonido" description="Un aviso suave al terminar cada fase.">
          <Switch id="s-sound" label="Sonidos de aviso" checked={settings.sound.enabled} onChange={(v) => updateSettings({ sound: { enabled: v } })} />
          <div className="flex items-center gap-3">
            <Volume2 size={16} className="text-ink-faint" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sound.volume}
              disabled={!settings.sound.enabled}
              onChange={(e) => updateSettings({ sound: { volume: Number(e.target.value) } })}
              aria-label="Volumen"
              className="w-48 accent-[rgb(var(--accent-fg))]"
            />
            <span className="w-10 font-mono text-xs text-ink-dim">{Math.round(settings.sound.volume * 100)}%</span>
            <Button size="sm" variant="ghost" disabled={!settings.sound.enabled} onClick={() => playChime(settings.sound.volume)}>
              Probar
            </Button>
          </div>
        </Section>

        <Section id="metas" title="Metas diarias" description="Tus referencias para el progreso de Inicio. Sin castigos: son una guía.">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="g-focus" label="Enfoque al día" value={settings.dailyFocusGoalMinutes} min={10} max={720} suffix="min" onCommit={(n) => updateSettings({ dailyFocusGoalMinutes: n })} />
            <NumberField id="g-tasks" label="Tareas al día" value={settings.dailyTaskGoal} min={1} max={50} suffix="tareas" onCommit={(n) => updateSettings({ dailyTaskGoal: n })} />
          </div>
          <p className="text-xs text-ink-faint">
            Los accesos rápidos se personalizan desde{' '}
            <Link href="/inicio" className="text-accent-fg hover:underline">
              Inicio
            </Link>
            .
          </p>
        </Section>

        <Section id="notificaciones" title="Notificaciones" description="Qué aparece en tu bandeja de actividad.">
          <Switch id="n-due" label="Recordatorios de vencimientos" description="Tareas vencidas y que vencen hoy." checked={settings.notifications.dueReminders} onChange={(v) => updateSettings({ notifications: { dueReminders: v } })} />
          <Switch id="n-ach" label="Logros e hitos" description="Objetivos cumplidos, proyectos completados, rachas." checked={settings.notifications.achievements} onChange={(v) => updateSettings({ notifications: { achievements: v } })} />
          <Switch id="n-soc" label="Amigos" description="Solicitudes, aceptaciones y retos." checked={settings.notifications.social} onChange={(v) => updateSettings({ notifications: { social: v } })} />
        </Section>

        <Section id="atajos" title="Atajos de teclado" description="⌘K siempre está disponible.">
          <Switch id="k-on" label="Atajos de una tecla" description="N nueva tarea, F enfoque, G+letra para navegar, ? ayuda." checked={settings.shortcuts.enabled} onChange={(v) => updateSettings({ shortcuts: { enabled: v } })} />
          <Button size="sm" icon={<Keyboard size={14} />} onClick={() => setShortcuts(true)}>
            Ver todos los atajos
          </Button>
        </Section>

        <Section id="privacidad" title="Privacidad y datos" description="Tus datos son tuyos.">
          <div className="space-y-3 text-sm text-ink-dim">
            <p>
              {mode === 'cloud'
                ? 'Tus datos se guardan en tu cuenta con acceso restringido a ti (seguridad a nivel de fila). El asistente solo recibe el resumen que ves antes de enviarlo.'
                : 'Estás en modo local: tus datos viven solo en este navegador. Borrar los datos del sitio los elimina.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button icon={<Download size={14} />} onClick={exportData}>
                Exportar mis datos (JSON)
              </Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={resetAll}>
                Borrar mis datos de productividad
              </Button>
              {session && (
                <Button
                  variant="ghost"
                  icon={<LogOut size={14} />}
                  onClick={async () => {
                    await signOut()
                    ws.clear()
                    router.replace('/login')
                  }}
                >
                  Cerrar sesión
                </Button>
              )}
            </div>
          </div>
        </Section>
      </Card>

      <p className="mt-6 text-center font-mono text-[11px] text-ink-faint">Kairo {APP_VERSION} · Kratos Labs</p>
    </div>
  )
}
