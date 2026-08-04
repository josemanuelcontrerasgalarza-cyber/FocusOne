/**
 * Historial de versiones de FocusOne (novedades mostradas al público).
 * `APP_VERSION` es la versión actual; la primera entrada de `CHANGELOG` debe
 * coincidir con ella.
 */

export const APP_VERSION = '5.5'

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
    version: '5.5',
    title: 'Deshacer, accesibilidad y hardening semanal',
    date: '4 ago 2026',
    tag: 'Actual',
    items: [
      'Borrar una misión ya no es definitivo: tienes unos segundos para "Deshacer" antes de que se borre de verdad.',
      'Deep Work te avisa si no iniciaste sesión, para que no pierdas una sesión de foco sin saberlo.',
      'La paleta de comandos (⌘K) y el cierre de misión ahora atrapan el foco del teclado y se pueden usar sin ratón.',
      'Auditoría de seguridad semanal: dependencias actualizadas, cierre de una posible redirección insegura tras iniciar sesión con Google, y límites más estrictos en la cola de notificaciones del ESP32.',
    ],
  },
  {
    version: '5.4',
    title: 'Tienda enorme y música que no se detiene',
    date: '3 ago 2026',
    items: [
      'Nueva Tienda con más de 550 ítems para desbloquear con tus puntos: mascotas, gorros, atuendos, accesorios, auras, fondos y mucho más.',
      'Los ítems equipables que compras se lucen en tu Focus Pet.',
      'La música ahora sigue sonando aunque cambies de pantalla, con un mini-reproductor flotante — hasta que tú decidas pararla.',
    ],
  },
  {
    version: '5.3',
    title: 'Música ilimitada y mascota con estilo',
    items: [
      'Música ilimitada, gratis y sin anuncios: reproductor propio con tendencias y buscador (vía Audius).',
      'Tu mascota ahora luce de verdad lo que le pones: gorros en la cabeza, gafas en la cara, bufanda y capa en el cuerpo.',
      'Consola de desarrollador real para la cuenta dev: logs en vivo, diagnóstico y acceso total.',
    ],
  },
  {
    version: '5.2',
    title: 'Entra con Google, más seguro y más rápido',
    items: [
      'Inicia sesión con Google en un toque, sin contraseña — tu progreso se guarda igual.',
      'Más seguridad: la puntuación de cada misión se verifica en el servidor y las opiniones tienen protección anti-spam.',
      'Carga más rápida y privada: tipografías propias, sin depender de Google Fonts.',
      'Herramientas de desarrollador para la cuenta dev (diamantes, racha, reseteo de pruebas).',
      'Mejor presencia en buscadores y una tarjeta con marca al compartir el enlace.',
    ],
  },
  {
    version: '5.1',
    title: 'Fragua sólida — seguridad y precisión',
    items: [
      'Todas tus misiones en un solo lugar: historial completo de forjadas, con su fecha.',
      'Seguridad reforzada de tu cuenta, tus puntos y la tienda (economía a prueba de trampas).',
      'Estadísticas de enfoque reales en «Hoy»: tiempo enfocado y promedio semanal a partir de tus sesiones.',
      'Tiempo enfocado más honesto: las sesiones que abandonas ya no cuentan como completas.',
      'Tienda y mascota al instante: sin dobles cobros y reflejando tu progreso al momento.',
      'Recompensa diaria más robusta ante zonas horarias, y decenas de correcciones y pulido.',
    ],
  },
  {
    version: '5.0',
    title: 'La Fragua — enfoque gamificado',
    items: [
      'Rediseño completo «La Fragua»: una sola misión protagonista por pantalla, con calor de forja y racha.',
      'Quiz de cierre para sellar cada misión y ganar puntos.',
      'Focus Pet: adopta tu mascota y vístela con lo que ganas forjando misiones.',
      'Tienda de recompensas con ropa nueva cada semana.',
      'Diamantes diarios: reclama tu recompensa cada día según tu hora local.',
      'Progreso renovado: productividad semanal, tiempo enfocado, calendario del mes y actividad reciente.',
      'Deep Work con duración personalizable y música integrada.',
      'Centro de comandos ⌘K más rápido y navegación renovada.',
    ],
  },
  {
    version: '4.1',
    title: 'Dashboard Pro y comunidad',
    date: '1 jul 2026',
    items: [
      'Dashboard renovado: productividad semanal, tiempo enfocado, calendario del mes y actividad reciente.',
      'Nuevo apartado «Descúbrela» con opiniones anónimas de la comunidad.',
      'Historial de novedades público, versión a versión.',
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
