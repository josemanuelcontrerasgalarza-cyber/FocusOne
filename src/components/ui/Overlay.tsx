'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { create } from 'zustand'
import { Button, IconButton } from './Button'

/* ───────────────────── utilidades de foco / scroll ───────────────────── */

function useOverlayBehavior(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foco inicial: primer elemento enfocable (o el propio panel).
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>(
        '[data-autofocus], input, textarea, select, button:not([data-close])',
      )
      ;(el ?? panel.current)?.focus()
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && panel.current) {
        // Trampa de foco sencilla.
        const f = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
        )
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [open, onClose, panel])
}

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

/* ───────────────────────────── Modal ───────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const panel = useRef<HTMLDivElement>(null)
  useOverlayBehavior(open, onClose, panel)
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-start sm:p-6 sm:pt-[12vh]">
            <motion.div
              className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={clsx(
                'relative max-h-[88vh] w-full overflow-y-auto rounded-t-card border border-line bg-raised shadow-pop outline-none sm:rounded-card',
                { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size],
              )}
            >
              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
                  <div>
                    {title && <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
                    {description && <p className="mt-1 text-sm text-ink-dim">{description}</p>}
                  </div>
                  <IconButton label="Cerrar" size="sm" onClick={onClose} data-close>
                    <X size={16} />
                  </IconButton>
                </div>
              )}
              {children && <div className="px-5 py-3">{children}</div>}
              {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

/* ───────────────────────────── Drawer ───────────────────────────── */

export function Drawer({
  open,
  onClose,
  children,
  label,
  side = 'right',
  width = 'max-w-[460px]',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label: string
  side?: 'right' | 'left'
  width?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  useOverlayBehavior(open, onClose, panel)
  const from = side === 'right' ? '100%' : '-100%'
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[90]">
            <motion.div
              className="absolute inset-0 bg-ink/20 dark:bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
            />
            <motion.aside
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              tabIndex={-1}
              initial={{ x: from }}
              animate={{ x: 0 }}
              exit={{ x: from }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={clsx(
                'absolute top-0 flex h-full w-full flex-col border-line bg-raised shadow-pop outline-none',
                width,
                side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              )}
            >
              {children}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

/* ─────────────────────── Confirmación (imperativa) ─────────────────────── */

interface ConfirmRequest {
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  resolve: (ok: boolean) => void
}

const useConfirmStore = create<{ req: ConfirmRequest | null; set: (r: ConfirmRequest | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}))

/** `await confirm({...})` → true si el usuario confirma. */
export function confirm(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.getState().set({ ...opts, resolve }))
}

export function ConfirmHost() {
  const { req, set } = useConfirmStore()
  const close = (ok: boolean) => {
    req?.resolve(ok)
    set(null)
  }
  return (
    <Modal
      open={Boolean(req)}
      onClose={() => close(false)}
      title={req?.title}
      description={req?.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button variant={req?.destructive ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
            {req?.confirmLabel ?? 'Confirmar'}
          </Button>
        </>
      }
    />
  )
}

/* ───────────────────────────── Menú ───────────────────────────── */

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  shortcut?: string
}

/** Menú desplegable anclado al disparador. Cierra con Escape o clic fuera. */
export function Menu({
  open,
  onClose,
  items,
  align = 'end',
  className,
}: {
  open: boolean
  onClose: () => void
  items: MenuItem[]
  align?: 'start' | 'end'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      ref={ref}
      role="menu"
      className={clsx(
        'absolute top-full z-50 mt-1 min-w-[180px] animate-scale-in rounded-control border border-line bg-raised p-1 shadow-pop',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      onKeyDown={(e) => {
        const btns = Array.from(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])
        const i = btns.indexOf(document.activeElement as HTMLElement)
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          btns[(i + 1) % btns.length]?.focus()
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          btns[(i - 1 + btns.length) % btns.length]?.focus()
        }
      }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          type="button"
          onClick={() => {
            onClose()
            it.onSelect()
          }}
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] outline-none transition-colors focus:bg-sunken',
            it.danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-sunken',
          )}
        >
          {it.icon && <span className="text-ink-dim">{it.icon}</span>}
          <span className="flex-1">{it.label}</span>
          {it.shortcut && <span className="font-mono text-[11px] text-ink-faint">{it.shortcut}</span>}
        </button>
      ))}
    </div>
  )
}
