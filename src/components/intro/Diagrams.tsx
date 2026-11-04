/*
 * Diagramas de la portada (SVG a mano, sin librerías). Texto y trazos heredan
 * los tokens del tema, así que se leen igual en claro y en oscuro. Cada uno
 * describe un mecanismo real del código: el recorrido de una tarea y cómo el
 * temporizador sobrevive a una recarga (src/lib/kairo/focusTimer.ts).
 */

function Arrowhead({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" className="fill-ink-faint" />
    </marker>
  )
}

function Node({
  x,
  y,
  w = 168,
  h = 62,
  title,
  sub,
  strong,
}: {
  x: number
  y: number
  w?: number
  h?: number
  title: string
  sub?: string
  strong?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        className={strong ? 'fill-raised stroke-accent-fg' : 'fill-raised stroke-line-strong'}
        strokeWidth={strong ? 2 : 1}
      />
      <text x={x + w / 2} y={sub ? y + h / 2 - 4 : y + h / 2 + 5} textAnchor="middle" className="fill-ink" fontSize={14} fontWeight={600}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" className="fill-ink-dim" fontSize={12}>
          {sub}
        </text>
      )}
    </g>
  )
}

function EdgeLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-ink-faint" fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
      {children}
    </text>
  )
}

/** De lo que escribes a tu progreso: el recorrido de una tarea. */
export function FlowDiagram() {
  const W = 1240
  const w = 156
  const gap = 107
  const xs = [0, 1, 2, 3, 4].map((i) => 16 + i * (w + gap))
  const y = 58
  const labels = ['parser', 'reglas', 'la empiezas', 'minutos reales']
  return (
    <figure className="m-0">
      <div className="overflow-x-auto rounded-card border border-line bg-surface p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${W} 210`}
          className="block h-auto w-full min-w-[820px]"
          role="img"
          aria-label="Recorrido de una tarea: escribes en lenguaje natural, el parser crea la tarea con fecha, duración y prioridad, las reglas la puntúan en el ranking, empiezas la primera en el modo enfoque y los minutos reales pasan a tus estadísticas. Al terminarla, el ranking propone la siguiente."
        >
          <defs>
            <Arrowhead id="flow-arrow" />
          </defs>
          <Node x={xs[0]} y={y} w={w} title="Escribes" sub="como hablas" />
          <Node x={xs[1]} y={y} w={w} title="Tarea" sub="fecha · duración · prioridad" />
          <Node x={xs[2]} y={y} w={w} title="Ranking" sub="puntos con motivo" strong />
          <Node x={xs[3]} y={y} w={w} title="Enfoque" sub="temporizador por reloj" />
          <Node x={xs[4]} y={y} w={w} title="Progreso" sub="estadísticas y nivel" />
          {labels.map((l, i) => {
            const x1 = xs[i] + w + 4
            const x2 = xs[i + 1] - 4
            return (
              <g key={l}>
                <line x1={x1} y1={y + 31} x2={x2} y2={y + 31} className="stroke-ink-faint" strokeWidth={1.5} markerEnd="url(#flow-arrow)" />
                <EdgeLabel x={(x1 + x2) / 2} y={y + 20}>
                  {l}
                </EdgeLabel>
              </g>
            )
          })}
          {/* Bucle: al completar, el ranking propone la siguiente */}
          <path
            d={`M ${xs[3] + w / 2} ${y + 66} C ${xs[3] + w / 2} 182, ${xs[2] + w / 2} 182, ${xs[2] + w / 2} ${y + 70}`}
            fill="none"
            className="stroke-ink-faint"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            markerEnd="url(#flow-arrow)"
          />
          <EdgeLabel x={(xs[2] + xs[3] + w) / 2} y={196}>
            al terminarla, la siguiente
          </EdgeLabel>
        </svg>
      </div>
      <figcaption className="mt-3 text-[13px] text-ink-dim">
        Cada paso usa datos que ya tienes. Lo único que decide Kairo es el orden, y siempre te dice por qué.
      </figcaption>
    </figure>
  )
}

/** Qué pasa con una sesión de enfoque si recargas o te vas. */
export function FocusDiagram() {
  return (
    <figure className="m-0">
      <div className="overflow-x-auto rounded-card border border-line bg-surface p-4 sm:p-6">
        <svg
          viewBox="0 0 940 300"
          className="block h-auto w-full min-w-[720px]"
          role="img"
          aria-label="Mientras la sesión está en marcha, la pantalla deja un latido cada 5 segundos en el navegador. Si recargas o vuelves, Kairo mira el último latido: si fue hace 90 segundos o menos, la sesión sigue donde estaba y cuenta como completa al llegar a cero. Si fue hace más, solo acredita el tiempo que viste y te pregunta si registrarlo, seguir desde ahí o descartarlo."
        >
          <defs>
            <Arrowhead id="focus-arrow" />
          </defs>

          <Node x={16} y={118} w={170} title="En marcha" sub="late cada 5 s" />
          <line x1={190} y1={149} x2={292} y2={149} className="stroke-ink-faint" strokeWidth={1.5} markerEnd="url(#focus-arrow)" />
          <EdgeLabel x={241} y={124}>
            recargas
          </EdgeLabel>
          <EdgeLabel x={241} y={139}>
            o vuelves
          </EdgeLabel>

          {/* Decisión */}
          <g>
            <polygon points="400,72 504,149 400,226 296,149" className="fill-raised stroke-accent-fg" strokeWidth={2} />
            <text x={400} y={138} textAnchor="middle" className="fill-ink" fontSize={13} fontWeight={600}>
              ¿Último latido
            </text>
            <text x={400} y={156} textAnchor="middle" className="fill-ink" fontSize={13} fontWeight={600}>
              hace más
            </text>
            <text x={400} y={174} textAnchor="middle" className="fill-ink" fontSize={13} fontWeight={600}>
              de 90 s?
            </text>
          </g>

          {/* No → sigue */}
          <path d="M 452 111 L 452 52 L 548 52" fill="none" className="stroke-ink-faint" strokeWidth={1.5} markerEnd="url(#focus-arrow)" />
          <EdgeLabel x={500} y={42}>
            no
          </EdgeLabel>
          <Node x={552} y={22} w={170} title="Sigue donde estaba" sub="sin perder un segundo" />
          <line x1={726} y1={53} x2={760} y2={53} className="stroke-ink-faint" strokeWidth={1.5} markerEnd="url(#focus-arrow)" />
          <Node x={764} y={22} w={160} title="Completa" sub="llegó a 0:00 abierta" strong />

          {/* Sí → estuviste fuera */}
          <path d="M 452 187 L 452 246 L 548 246" fill="none" className="stroke-ink-faint" strokeWidth={1.5} markerEnd="url(#focus-arrow)" />
          <EdgeLabel x={500} y={236}>
            sí
          </EdgeLabel>
          <Node x={552} y={215} w={170} title="Estuviste fuera" sub="cuenta solo lo visto" />
          {['Registrar lo visto', 'Seguir desde ahí', 'Descartar'].map((t, i) => {
            const yy = 168 + i * 44
            return (
              <g key={t}>
                <path d={`M 726 246 C 744 246, 744 ${yy + 15}, 760 ${yy + 15}`} fill="none" className="stroke-ink-faint" strokeWidth={1.2} markerEnd="url(#focus-arrow)" />
                <rect x={764} y={yy} width={160} height={30} rx={15} className="fill-sunken stroke-line" strokeWidth={1} />
                <text x={844} y={yy + 19.5} textAnchor="middle" className="fill-ink-dim" fontSize={12}>
                  {t}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="mt-3 text-[13px] text-ink-dim">
        Una sesión solo cuenta como completa si el reloj llegó a cero con la pantalla abierta. Si te fuiste, tú decides
        qué registrar.
      </figcaption>
    </figure>
  )
}
