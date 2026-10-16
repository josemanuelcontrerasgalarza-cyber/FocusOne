'use client'

import { Fragment, useMemo } from 'react'
import { parseRichText, type Inline } from '@/lib/ai/richText'

/** Pinta texto del asistente como elementos React (párrafos, listas, negrita). Nunca HTML. */
function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-semibold text-ink">
            {p.text}
          </strong>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  )
}

export function RichText({ text }: { text: string }) {
  const blocks = useMemo(() => parseRichText(text), [text])
  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed text-ink">
      {blocks.map((b, i) => {
        if (b.type === 'p')
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inlines parts={l} />
                </Fragment>
              ))}
            </p>
          )
        const Tag = b.type === 'ul' ? 'ul' : 'ol'
        return (
          <Tag key={i} className={b.type === 'ul' ? 'list-disc space-y-1 pl-5 marker:text-ink-faint' : 'list-decimal space-y-1 pl-5 marker:text-ink-faint'}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inlines parts={it} />
              </li>
            ))}
          </Tag>
        )
      })}
    </div>
  )
}
