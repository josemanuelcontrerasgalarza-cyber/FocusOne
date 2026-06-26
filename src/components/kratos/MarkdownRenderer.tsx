'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CodeBlock } from './CodeBlock'

/**
 * Renderizador de markdown para las respuestas de KRATOS IA.
 * - remark-gfm: tablas, listas de tareas, tachado, autolinks.
 * - rehype-highlight: resaltado de sintaxis (tema propio en globals.css).
 *
 * Se carga con `next/dynamic` desde ChatMessage para mantener react-markdown +
 * highlight.js fuera del bundle inicial (solo se descarga al abrir el chat).
 */
export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="kratos-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // El <pre> lo controla CodeBlock; aquí lo dejamos pasar.
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '')
            if (match) {
              return (
                <CodeBlock language={match[1]} codeClassName={className}>
                  {children}
                </CodeBlock>
              )
            }
            return <code className="kratos-inline-code">{children}</code>
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
