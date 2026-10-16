import clsx from 'clsx'

/**
 * Marca de Kairo: un anillo de tiempo abierto con un punto en el hueco — el
 * "momento oportuno" (kairós). El anillo hereda `currentColor`; el punto usa
 * el acento. Geometría: r=10 centrada en 16,16; hueco entre -80° y -20°.
 */
export function KairoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M25.4 12.58A10 10 0 1 1 17.74 6.15"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="22.43" cy="8.34" r="2.7" fill="rgb(var(--accent))" />
    </svg>
  )
}

/** Logotipo completo: marca + wordmark "kairo". */
export function KairoLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: ['h-5 w-5', 'text-[15px]'], md: ['h-6 w-6', 'text-[17px]'], lg: ['h-8 w-8', 'text-2xl'] }[size]
  return (
    <span className={clsx('inline-flex items-center gap-2 text-ink', className)}>
      <KairoMark className={s[0]} />
      <span className={clsx('font-sans font-semibold lowercase tracking-[-0.03em]', s[1])}>kairo</span>
    </span>
  )
}
