import { ShieldCheck } from 'lucide-react'

/** Explica exactamente qué datos viajan al asistente. */
export function ContextDisclosure() {
  return (
    <details className="group rounded-control border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink-dim">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
        <ShieldCheck size={15} className="text-ink-dim" aria-hidden />
        Qué datos se comparten
        <span className="ml-auto text-xs text-ink-faint group-open:hidden">Ver</span>
        <span className="ml-auto hidden text-xs text-ink-faint group-open:inline">Ocultar</span>
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed">
        <p>
          Solo cuando usas una acción con IA, Kairo envía a su servidor (y este a Groq) un resumen compacto de tu espacio de
          trabajo:
        </p>
        <ul className="list-disc space-y-0.5 pl-5 marker:text-ink-faint">
          <li>Fecha y hora local de hoy.</li>
          <li>
            Hasta 40 tareas abiertas ordenadas por prioridad: título, prioridad, fecha y hora límite, estimación, estado, nombre
            del proyecto y número de subtareas.
          </li>
          <li>Cuántas tareas tienes vencidas y para hoy.</li>
          <li>Proyectos y objetivos activos con su progreso.</li>
          <li>Resumen de enfoque de los últimos 7 días y tu objetivo diario de minutos.</li>
          <li>Tus hábitos y si ya están hechos hoy.</li>
          <li>
            Al dividir o desbloquear una tarea: su descripción (recortada) y los títulos de sus subtareas.
          </li>
          <li>En la conversación, tus últimos mensajes de esta sesión.</li>
        </ul>
        <p>
          No se envían tu correo, tu nombre, notas de sesiones ni tareas completadas. La conversación se guarda solo en esta
          pestaña. «¿Qué hago ahora?» y «Tareas vencidas» se calculan en tu dispositivo y no envían nada.
        </p>
      </div>
    </details>
  )
}
