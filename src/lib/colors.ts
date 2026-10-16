import type { ProjectColor } from '@/lib/kairo/types'

/** Colores de identificación de proyectos/objetivos. Legibles en claro y oscuro. */
export const PROJECT_COLORS: Record<ProjectColor, { label: string; hex: string }> = {
  lime: { label: 'Lima', hex: '#8DB51F' },
  sky: { label: 'Cielo', hex: '#4A9EE6' },
  violet: { label: 'Violeta', hex: '#8B74E8' },
  rose: { label: 'Rosa', hex: '#E26A86' },
  amber: { label: 'Ámbar', hex: '#D9A23C' },
  teal: { label: 'Turquesa', hex: '#36AE9C' },
  slate: { label: 'Pizarra', hex: '#8A8F98' },
}

export const colorHex = (c: string | null | undefined) =>
  PROJECT_COLORS[(c as ProjectColor) ?? 'slate']?.hex ?? PROJECT_COLORS.slate.hex

/** Colores por prioridad (anillo del check). */
export const PRIORITY_HEX: Record<1 | 2 | 3 | 4, string> = {
  1: 'rgb(var(--ink-faint))',
  2: 'rgb(var(--ink-dim))',
  3: '#D9A23C',
  4: 'rgb(var(--danger))',
}
