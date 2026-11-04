'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { MoreHorizontal, Timer, Pencil, Trash2, CircleDot, Circle, CalendarDays, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { addDays, toDateKey } from '@/lib/kairo/dates'
import { subtasksOf } from '@/lib/kairo/tasks'
import { confirm, Menu, type MenuItem } from '@/components/ui/Overlay'
import { toast } from '@/lib/toast'
import { TaskCheck, TaskMeta } from './TaskBits'
import type { Task } from '@/lib/kairo/types'

/** Acciones contextuales comunes a cualquier tarea (menú y clic derecho). */
export function useTaskActions(task: Task) {
  const router = useRouter()
  const { setTaskStatus, updateTask, deleteTask, tasks } = useWorkspace()
  const openTask = useUI((s) => s.openTask)
  const today = toDateKey(new Date())

  const items: MenuItem[] = [
    { label: 'Abrir detalles', icon: <Pencil size={14} />, onSelect: () => openTask(task.id), shortcut: '↵' },
    { label: 'Enfocar ahora', icon: <Timer size={14} />, onSelect: () => router.push(`/enfoque?task=${task.id}`) },
  ]
  if (task.status !== 'completed') {
    items.push(
      task.status === 'in_progress' || task.status === 'active'
        ? { label: 'Volver a pendiente', icon: <Circle size={14} />, onSelect: () => setTaskStatus(task.id, 'pending') }
        : { label: 'Marcar en curso', icon: <CircleDot size={14} />, onSelect: () => setTaskStatus(task.id, 'in_progress') },
    )
    if (task.due_date !== today)
      items.push({ label: 'Programar para hoy', icon: <CalendarDays size={14} />, onSelect: () => updateTask(task.id, { due_date: today }) })
    items.push({
      label: 'Pasar a mañana',
      icon: <ArrowRight size={14} />,
      onSelect: () => updateTask(task.id, { due_date: addDays(today, 1) }),
    })
  }
  items.push({
    label: 'Eliminar',
    icon: <Trash2 size={14} />,
    danger: true,
    onSelect: async () => {
      const subs = subtasksOf(tasks, task.id).length
      const ok = await confirm({
        title: '¿Eliminar esta tarea?',
        description: subs
          ? `«${task.title}» y sus ${subs} subtareas se eliminarán definitivamente.`
          : `«${task.title}» se eliminará definitivamente.`,
        confirmLabel: 'Eliminar',
        destructive: true,
      })
      if (ok) void deleteTask(task.id)
    },
  })
  return items
}

/** true en pantallas táctiles (donde se activan los gestos de deslizar). */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return coarse
}

const SWIPE = 88

export function TaskRow({
  task,
  today,
  showProject = true,
  className,
  dense,
}: {
  task: Task
  today: string
  showProject?: boolean
  className?: string
  dense?: boolean
}) {
  const { toggleTask, updateTask, projects, tasks } = useWorkspace()
  const coarse = useCoarsePointer()
  const x = useMotionValue(0)
  const doneOpacity = useTransform(x, [0, SWIPE], [0, 1])
  const laterOpacity = useTransform(x, [-SWIPE, 0], [1, 0])
  const liftOpacity = useTransform(x, [-6, 0, 6], [1, 0, 1])
  const openTask = useUI((s) => s.openTask)
  const [menu, setMenu] = useState(false)
  const actions = useTaskActions(task)
  const done = task.status === 'completed'
  const project = showProject && task.project_id ? projects.find((p) => p.id === task.project_id) ?? null : null
  const subs = subtasksOf(tasks, task.id)
  const subProgress = subs.length ? { done: subs.filter((s) => s.status === 'completed').length, total: subs.length } : undefined

  const canPostpone = !done
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE) void toggleTask(task.id)
    else if (info.offset.x < -SWIPE && canPostpone) {
      const prev = { due_date: task.due_date, due_time: task.due_time }
      void updateTask(task.id, { due_date: addDays(today, 1) })
      toast.success('Pasada a mañana', { action: { label: 'Deshacer', onClick: () => void updateTask(task.id, prev) } })
    }
  }

  const row = (
    <div
      className={clsx(
        'group relative flex items-start gap-3 rounded-control px-3 transition-colors hover:bg-sunken/70',
        dense ? 'py-2' : 'py-2.5',
        className,
      )}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu(true)
      }}
    >
      <div className="pt-[3px]">
        <TaskCheck
          done={done}
          priority={task.priority}
          onToggle={() => toggleTask(task.id)}
          label={done ? `Reabrir «${task.title}»` : `Completar «${task.title}»`}
        />
      </div>
      <button
        type="button"
        onClick={() => openTask(task.id)}
        className="min-w-0 flex-1 text-left outline-none"
        aria-label={`Abrir «${task.title}»`}
      >
        <p
          className={clsx(
            'text-[14px] leading-snug',
            done ? 'text-ink-faint line-through decoration-ink-faint/60' : 'text-ink',
          )}
        >
          {(task.status === 'in_progress' || task.status === 'active') && !done && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-accent-fg" title="En curso" />
          )}
          {task.title}
        </p>
        <div className="mt-1 empty:hidden">
          <TaskMeta task={task} today={today} project={project} subtasks={subProgress} compact={dense} />
        </div>
      </button>
      <div className="relative flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Más acciones"
          aria-haspopup="menu"
          className="-my-1 -mr-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-faint hover:bg-raised hover:text-ink sm:my-0 sm:mr-0 sm:h-7 sm:w-7"
        >
          <MoreHorizontal size={16} />
        </button>
        <Menu open={menu} onClose={() => setMenu(false)} items={actions} />
      </div>
    </div>
  )

  if (!coarse) return row

  // Táctil: deslizar a la derecha completa (o reabre); a la izquierda, a mañana.
  return (
    <div className="relative overflow-hidden rounded-control">
      <motion.div
        aria-hidden
        style={{ opacity: doneOpacity }}
        className="absolute inset-0 flex items-center gap-2 bg-success/15 pl-4 text-[13px] font-medium text-success"
      >
        {done ? <RotateCcw size={16} /> : <Check size={16} />}
        {done ? 'Reabrir' : 'Completar'}
      </motion.div>
      {canPostpone && (
        <motion.div
          aria-hidden
          style={{ opacity: laterOpacity }}
          className="absolute inset-0 flex items-center justify-end gap-2 bg-warm/15 pr-4 text-[13px] font-medium text-warm"
        >
          Mañana
          <ArrowRight size={16} />
        </motion.div>
      )}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: canPostpone ? 0.55 : 0.08, right: 0.55 }}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        style={{ x }}
        className="relative"
      >
        <motion.div aria-hidden style={{ opacity: liftOpacity }} className="absolute inset-0 rounded-control bg-raised shadow-card" />
        {row}
      </motion.div>
    </div>
  )
}
