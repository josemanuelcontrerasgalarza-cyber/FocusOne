'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  language?: string
  /** className original del <code> (incluye `hljs language-x` para el tema). */
  codeClassName?: string
  children: ReactNode
}

/**
 * Bloque de código con etiqueta de lenguaje y botón de copiar. El resaltado lo
 * aplica rehype-highlight (los `children` ya traen los spans de highlight.js);
 * el texto a copiar se lee del DOM para no perder el formato.
 */
export function CodeBlock({ language, codeClassName, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  function copy() {
    const text = ref.current?.textContent ?? ''
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => undefined,
    )
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-glass-border bg-black/40">
      <div className="flex items-center justify-between border-b border-glass-border px-3 py-1.5">
        <span className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
          {language || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 font-data text-[11px] text-ink-ghost transition-colors hover:text-core"
        >
          {copied ? (
            <>
              <Check size={12} /> Copiado
            </>
          ) : (
            <>
              <Copy size={12} /> Copiar
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        <code ref={ref} className={cn('font-data', codeClassName)}>
          {children}
        </code>
      </pre>
    </div>
  )
}
