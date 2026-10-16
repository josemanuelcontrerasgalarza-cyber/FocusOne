# Kairo — Guía de producto, diseño y desarrollo

> Kairo es la evolución de FocusOne: un centro de control personal que responde
> a una pregunta — **¿qué debería hacer ahora para avanzar de verdad?** — y te
> ayuda a hacerlo (tareas, enfoque, proyectos, objetivos, estadísticas e IA).

---

## 1. Marca

| | |
|---|---|
| **Nombre** | **Kairo** — de *kairós*, "el momento oportuno". |
| **Promesa** | *Lo importante, ahora.* |
| **Personalidad** | Calmada, precisa, cálida. Un buen coach, no un capataz. |
| **Voz** | Tuteo, frases cortas, verbos de acción. Sin culpa ni hype. Ejemplos: "Tu siguiente movimiento", "Todo al día", "Hecho. Próxima repetición programada.", "Descansar también cuenta". Nada de exclamaciones en cadena ni emojis en la UI de producto. |
| **Logotipo** | Anillo de tiempo abierto con un punto lima en el hueco (`src/components/brand/Logo.tsx`: `KairoMark`, `KairoLogo`). Wordmark en minúsculas, Geist semibold, tracking −0.03em. |
| **Icono** | Tile grafito con anillo marfil + punto lima (`src/app/icon.svg`, `apple-icon.tsx`). |

Compatibilidad: el dominio, el nombre del paquete npm y los identificadores
técnicos (tabla `missions`, claves de almacenamiento antiguas) se mantienen para
no romper instalaciones ni datos. Toda la superficie visible dice **Kairo**.

## 2. Sistema de diseño

**Dirección artística:** minimalismo editorial. Grafito + marfil + un único
acento lima. Superficies planas con bordes finos; sin degradados decorativos,
sin glassmorphism, sombras casi imperceptibles. La jerarquía la hacen la
tipografía y el espacio, no los efectos.

### Color (tokens en `src/app/globals.css`, ambos temas)

| Token Tailwind | Uso |
|---|---|
| `bg-canvas` | Fondo de la app |
| `bg-surface` | Tarjetas, sidebar |
| `bg-raised` | Popovers, modales, inputs, elemento activo |
| `bg-sunken` | Hover, pistas de progreso, chips neutros |
| `border-line` / `border-line-strong` | Bordes (hover = strong) |
| `text-ink` / `text-ink-dim` / `text-ink-faint` | Texto principal / secundario / pistas |
| `bg-accent` + `text-accent-ink` | **Acción primaria** (relleno lima con texto oscuro). Un solo botón primario por vista. |
| `text-accent-fg`, `bg-accent-fg` | Acento como texto/indicador (legible en ambos temas) |
| `warm`, `success`, `warning`, `danger`, `info` | Estados semánticos |

Todos admiten opacidad: `bg-accent/10`, `border-danger/30`.
Los alias `forge-*`, `ember`, `metal` existen solo por compatibilidad: **no usar en código nuevo**.

### Tipografía
- **Geist** (`font-sans`) — interfaz.
- **Geist Mono** (`font-mono`) — cifras, tiempos, datos (tabulares).
- **Instrument Serif** (`font-display`) — solo para momentos expresivos (saludo de Inicio, celebración de Enfoque, landing). Nunca en controles.
- Escala: títulos de página `text-[28px]/[32px] font-semibold tracking-[-0.025em]`; títulos de tarjeta `text-[15px] font-semibold`; cuerpo `text-sm`/`text-[14px]`; micro-etiquetas `.k-eyebrow`.

### Forma y movimiento
- Radios: `rounded-card` (14px) tarjetas · `rounded-control` (9px) botones/inputs · `rounded-full` solo para checks, avatares y chips de estado.
- Sombras: `shadow-card` (casi nula), `shadow-pop` (menús/modales).
- Animación: 150–220 ms, `ease-out` (`cubic-bezier(.16,1,.3,1)`). Entradas con `animate-fade-in` / `animate-scale-in`. `prefers-reduced-motion` desactiva todo (global).
- Iconos: `lucide-react`, 16–18px, trazo 1.9 (2.2 si activo). Sin iconos decorativos de relleno.

### Componentes (`src/components/ui`)
- `Button` (`variant: primary|secondary|ghost|quiet|danger`, `size: sm|md|lg`, `icon`, `loading`), `IconButton` (`label` obligatorio).
- `primitives.tsx`: `Card`, `CardHeader`, `PageHeader`, `Badge` (`tone`), `Kbd`, `Skeleton`, `EmptyState`, `ProgressBar`, `ProgressRing`, `Field`, `Segmented`, `Avatar`, `Stat`.
- `Overlay.tsx`: `Modal`, `Drawer`, `confirm()` (promesa; usar SIEMPRE antes de borrar), `Menu` (menú contextual con teclado).
- Clases utilitarias: `.k-card`, `.k-input`, `.k-eyebrow`, `.k-skeleton`.
- Avisos: `toast.success|error|info(msg, { action: { label, onClick } })`.

### Patrones obligatorios
- Cada vista: `PageHeader` + contenido en `mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8`.
- Estado vacío útil (qué es y cuál es el primer paso) en toda lista.
- Nada decorativo que no funcione. Si algo no está disponible, se dice.
- Accesibilidad: controles con nombre accesible, foco visible, navegables por teclado; contraste AA.

## 3. Arquitectura

```
src/
  app/
    (app)/            espacio de trabajo (requiere sesión cuando hay backend)
      layout.tsx      AppShell + GlobalPlayer
      inicio/ tareas/ enfoque/ calendario/ proyectos/ objetivos/
      estadisticas/ asistente/ ajustes/ perfil/ tienda/ mascota/ amigos/ musica/ dev/
    api/              route handlers (reviews, music, assistant)
    page.tsx          landing pública · login/ · register/
  components/
    brand/ ui/ shell/ tasks/ charts/
  lib/
    kairo/            LÓGICA PURA + pruebas (sin React/Supabase)
    data/repo.ts      repositorio dual: Supabase (cloud) | localStorage (local)
    ai/               cliente Groq (servidor)
  store/
    workspace.ts      estado único optimista (tareas, proyectos, objetivos, hábitos, sesiones, ajustes)
    uiStore.ts        paleta, captura rápida, cajón de tarea, sidebar
    themeStore.ts     tema claro/oscuro/sistema
supabase/
  setup_all.sql       instalación idempotente completa (incluye 13_kairo.sql)
  migrations/13_kairo.sql
```

### Datos
- **Tareas** = tabla `missions` (evolucionada): `priority 1-4`, `due_date`, `due_time`, `tags[]`, `parent_id` (subtareas), `project_id`, `goal_id`, `recurrence`, `estimated_minutes` (opcional), `status: pending | in_progress | active | completed` (`active` = la tarea en enfoque, única por usuario).
- **Proyectos** = tabla `projects` (se reutiliza la legada si existe).
- **Objetivos** `goals` (medibles `target_value/current_value` o por tareas vinculadas), **hábitos** `habits` + `habit_logs`, **ajustes** `user_settings.prefs`, **enfoque** `focus_sessions` (+ `actual_seconds`).
- RLS por usuario en todo; triggers que impiden referenciar proyectos/objetivos/tareas de otro usuario.
- Modo **local**: si faltan `NEXT_PUBLIC_SUPABASE_*`, el mismo store usa localStorage y la UI lo indica con una franja.

### Store (`useWorkspace`)
Lectura: `tasks, projects, goals, habits, habitLogs, sessions, settings, profile, totals, mode, status`.
Acciones: `addTask, updateTask, setTaskStatus, toggleTask, deleteTask, patchTaskLocal, addProject, updateProject, deleteProject, addGoal, updateGoal, bumpGoal, deleteGoal, addHabit, updateHabit, deleteHabit, toggleHabitDay, startSession, finishSession, updateSettings, setName, refreshTotals, resetProductivity`.
Todas son optimistas y muestran errores comprensibles (`lib/errors.ts`).

### Lógica pura (`src/lib/kairo`, con pruebas `node --test`)
`dates` (fechas locales), `parse` (captura en lenguaje natural), `priority` (siguiente movimiento explicable), `tasks` (filtros, orden, progreso), `recurrence`, `streaks`, `xp`, `stats`, `focusTimer` (temporizador por reloj resistente a recargas).

### UI global
- `useUI().openCapture(defaults?)` — captura rápida (atajo **N**).
- `useUI().openTask(id)` — cajón de detalle de tarea.
- `useUI().setPalette(true)` — paleta **⌘K**.
- `TaskRow`, `TaskCheck`, `TaskMeta`, `QuickAddBar` en `components/tasks`.

## 4. Convenciones
- Páginas: `page.tsx` (servidor, exporta `metadata`) que renderiza un componente cliente en `_components/`.
- Sin datos ficticios: si no hay datos, estado vacío.
- Fechas de tareas siempre como clave local `YYYY-MM-DD` (`lib/kairo/dates.ts`).
- Imports dentro de `lib/kairo` con extensión `.ts` (requisito del runner de Node).
- Nuevas dependencias solo si están justificadas.

## 5. Comandos
```
npm run dev        # desarrollo
npm run typecheck  # TypeScript
npm test           # pruebas de lógica (node:test)
npm run build      # build de producción
```

## 6. Configuración
| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Backend (sin ellas: modo local) |
| `GROQ_API_KEY` | Asistente IA (servidor). Sin ella, el asistente avisa y ofrece las funciones locales |
| `GROQ_MODEL` (opcional) | Modelo de Groq (por defecto `llama-3.3-70b-versatile`) |

Base de datos: ejecutar `supabase/setup_all.sql` en el SQL Editor (idempotente, no destructivo).
