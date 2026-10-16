import { Cpu, Sparkles } from 'lucide-react'

/** Etiqueta del origen de una respuesta: IA o cálculo local. */
export function SourceTag({ source }: { source: 'ai' | 'local' }) {
  return source === 'local' ? (
    <p className="k-eyebrow flex items-center gap-1.5">
      <Cpu size={12} aria-hidden /> Calculado en tu dispositivo (sin IA)
    </p>
  ) : (
    <p className="k-eyebrow flex items-center gap-1.5">
      <Sparkles size={12} aria-hidden /> Propuesta de la IA
    </p>
  )
}
