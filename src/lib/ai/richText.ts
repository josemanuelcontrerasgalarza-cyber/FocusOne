/**
 * Parser mínimo y SEGURO para el texto del asistente: párrafos, listas
 * ("- ", "* ", "• ", "1. ") y **negrita**. Produce una estructura que el
 * componente React pinta como texto (nunca HTML).
 */

export interface Inline {
  text: string
  bold: boolean
}

export type RichBlock =
  | { type: 'p'; lines: Inline[][] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; items: Inline[][] }

export function parseInline(s: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false })
    out.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false })
  return out.filter((x) => x.text.length > 0)
}

const BULLET = /^\s*(?:[-*•])\s+(.*)$/
const ORDERED = /^\s*\d{1,2}[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

export function parseRichText(src: string): RichBlock[] {
  const blocks: RichBlock[] = []
  let para: Inline[][] | null = null
  let list: { type: 'ul' | 'ol'; items: Inline[][] } | null = null

  const flush = () => {
    if (para) blocks.push({ type: 'p', lines: para })
    if (list) blocks.push({ type: list.type, items: list.items })
    para = null
    list = null
  }

  for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    const b = line.match(BULLET)
    const o = !b ? line.match(ORDERED) : null
    if (b || o) {
      const type = b ? 'ul' : 'ol'
      const text = (b ?? o)![1]
      if (para) {
        blocks.push({ type: 'p', lines: para })
        para = null
      }
      if (!list || list.type !== type) {
        if (list) blocks.push({ type: list.type, items: list.items })
        list = { type, items: [] }
      }
      list.items.push(parseInline(text))
      continue
    }
    if (list) {
      blocks.push({ type: list.type, items: list.items })
      list = null
    }
    const h = line.match(HEADING)
    const inline = h ? [{ text: h[1].replace(/\*\*/g, ''), bold: true }] : parseInline(line.trim())
    ;(para ??= []).push(inline)
  }
  flush()
  return blocks
}
