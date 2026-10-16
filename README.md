# Kairo

> Lo importante, ahora.

Kairo es un espacio de trabajo personal que te ayuda a decidir qué hacer a
continuación: tareas, proyectos, objetivos, hábitos, sesiones de enfoque,
calendario y estadísticas en un solo lugar, con una recomendación explicable de
«Tu siguiente movimiento» calculada a partir de tus datos reales.

> El repositorio y el paquete conservan el identificador técnico `focusone`
> para no romper despliegues ni URLs existentes. La marca visible es Kairo.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript estricto
- **Tailwind CSS** con tokens semánticos (tema claro y oscuro) + Framer Motion
- **Supabase** (auth, Postgres, RLS) + **Zustand**
- **Groq** (opcional, solo en el servidor) para el asistente

## Documentación

- [`docs/KAIRO.md`](docs/KAIRO.md) — marca, sistema de diseño, arquitectura,
  modelo de datos y convenciones.
- `docs/PLAN_MAESTRO.md` es un documento histórico de versiones anteriores.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables (ver abajo)
npm run dev
```

Sin variables de Supabase la app funciona en **modo local**: los datos se guardan
solo en el navegador y se muestra un aviso. No hay sincronización en ese modo.

### Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | Clave anónima (pública; la seguridad la imponen las políticas RLS) |
| `GROQ_API_KEY` | **solo servidor** | Activa el asistente. Sin ella, el asistente indica que no está configurado |
| `GROQ_MODEL` | solo servidor | Opcional. Por defecto `llama-3.3-70b-versatile` |

Nunca uses el prefijo `NEXT_PUBLIC_` para la clave de Groq.

### Base de datos

Ejecuta `supabase/setup_all.sql` en el SQL Editor de Supabase. Es idempotente:
se puede volver a ejecutar sobre una base existente sin borrar datos. La
migración `supabase/migrations/13_kairo.sql` (incluida en `setup_all.sql`)
añade objetivos, hábitos, ajustes y amplía tareas y proyectos; importa las
tareas antiguas sin duplicarlas y no elimina nada.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm test` | Pruebas unitarias de la lógica (`node --test`) |
| `npx tsc --noEmit` | Comprobación de tipos |

## Rutas principales

| Ruta | Descripción |
|---|---|
| `/` | Página pública |
| `/inicio` | Centro de control y «Tu siguiente movimiento» |
| `/tareas` | Tareas en lista o tablero, filtros y búsqueda |
| `/enfoque` | Sesiones de enfoque (pomodoro configurable) |
| `/calendario` | Vista de día y semana |
| `/proyectos` | Proyectos y su detalle |
| `/objetivos` | Objetivos y hábitos |
| `/estadisticas` | Estadísticas con tus datos |
| `/asistente` | Asistente con IA |
| `/ajustes` | Preferencias, exportación de datos y cuenta |

Las rutas antiguas (`/hoy`, `/misiones`, `/focus`, `/stats`…) redirigen a las nuevas.
