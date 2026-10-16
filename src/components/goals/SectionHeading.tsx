import type { ReactNode } from 'react'

/** Encabezado de sección dentro de la página (h2 + descripción + acción). */
export function SectionHeading({
  id,
  title,
  description,
  action,
}: {
  id: string
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-dim">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}
