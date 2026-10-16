import clsx from 'clsx'

/** Hueco compacto para un gráfico sin datos en el periodo. Mantiene la altura. */
export function ChartEmpty({
  height = 160,
  title = 'Sin datos en este periodo',
  hint,
  className,
}: {
  height?: number
  title?: string
  hint?: string
  className?: string
}) {
  return (
    <div
      className={clsx('flex flex-col items-center justify-center rounded-control border border-dashed border-line px-4 text-center', className)}
      style={{ minHeight: height }}
    >
      <p className="text-[13px] font-medium text-ink-dim">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}
