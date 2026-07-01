/**
 * Historial de versiones de FocusOne (novedades mostradas al público).
 * `APP_VERSION` es la versión actual; la primera entrada de `CHANGELOG` debe
 * coincidir con ella.
 */

export const APP_VERSION = '4.1'

export interface ChangelogEntry {
  version: string
  title: string
  /** Fecha legible (opcional). Solo la última suele llevarla. */
  date?: string
  /** Etiqueta breve (ej. "Actual", "Novedad"). */
  tag?: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4.1',
    title: 'KRATOS IA + Dashboard Pro',
    date: '1 jul 2026',
    tag: 'Actual',
    items: [
      'Nuevo asistente KRATOS IA: chat con historial, markdown y bloques de código.',
      'Preparado para conectar modelos de IA (Groq, OpenAI, Anthropic, Gemini).',
      'Dashboard renovado: productividad semanal, tiempo enfocado, calendario del mes y actividad reciente.',
    ],
  },
  {
    version: '4.0',
    title: 'Gran expansión de funciones',
    items: [
      'Centro de comandos (⌘K) para navegar y actuar al instante.',
      'Meta diaria con anillo de progreso y agenda «Para hoy».',
      'Fechas de vencimiento, filtros y orden en tus objetivos.',
      'Etiquetas en las ideas.',
      'Logros e insignias por tu constancia.',
      'Ciclo Pomodoro con descansos e historial de Deep Work.',
      'Exporta todos tus datos a JSON.',
    ],
  },
  {
    version: '3.0',
    title: 'Rediseño visual HORIZON',
    items: [
      'Interfaz inmersiva renovada con cristal líquido y cosmos 3D.',
      'Componentes más pulidos y animaciones fluidas.',
      'Temporizador de Deep Work circular.',
    ],
  },
  {
    version: '2.0',
    title: 'Modo demo y motor en tiempo real',
    items: [
      'Prueba sin registro con el Modo Demo.',
      'Racha y estadísticas calculadas en el servidor: a prueba de trampas.',
      'Centro de mando más rápido, con datos en tiempo real.',
    ],
  },
  {
    version: '1.0',
    title: 'Lanzamiento de FocusOne',
    items: [
      'Misiones con una principal a la vez: termina lo que empiezas.',
      'Sesiones de Deep Work a pantalla completa.',
      'Bóveda de ideas y telemetría de tu progreso.',
    ],
  },
]
