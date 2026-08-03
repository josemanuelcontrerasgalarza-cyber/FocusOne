# FocusOne — Kratos Labs

> Termina lo que empiezas.

Plataforma de productividad AI-First con interfaz inmersiva 3D (sistema de diseño
**HORIZON**). Tus proyectos son misiones, tus tareas objetivos, y Kratos —el orbe—
vive en el centro de tu cosmos.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Three.js + React Three Fiber + Drei** — cosmos 3D, orbe Kratos con shaders GLSL
- **Tailwind CSS** + cristal líquido (glassmorphism) + **Framer Motion**
- **Supabase** (auth + Postgres + RLS) + **Zustand**

## Documentación

- [`docs/PLAN_MAESTRO.md`](docs/PLAN_MAESTRO.md) — auditoría técnica y roadmap AI-First (Groq)
- [`docs/HORIZON_DESIGN_SYSTEM.md`](docs/HORIZON_DESIGN_SYSTEM.md) — sistema de diseño inmersivo

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Base de datos
# Ejecutar supabase/schema.sql y supabase/migrations/*.sql en el SQL Editor de Supabase

# 4. Iniciar
npm run dev
```

## Despliegue en Vercel

1. Framework preset: **Next.js** (se detecta automáticamente).
2. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   ⚠️ Son nuevas — las antiguas `VITE_*` ya no se usan.
3. Ejecuta `supabase/migrations/02_focus_sessions.sql` en Supabase para habilitar
   el registro de sesiones de Deep Work.

## Rutas

| Ruta | Descripción |
|---|---|
| `/hoy` | La Fragua — misión activa, timer y estadísticas del día |
| `/misiones` | Crear, encender, borrar y ver el historial de misiones |
| `/deep-work` | Sesiones de foco de duración personalizable |
| `/progreso` | Telemetría: racha, tiempo enfocado, calendario del mes |
| `/mascota` | Focus Pet — viste tu mascota con lo que ganas forjando |
| `/musica` | Frecuencias de foco (Spotify) |
| `/perfil` | Cuenta, tienda de recompensas y ajustes |

Las rutas del diseño anterior (`/app`, `/focus`, `/projects`, `/ideas`,
`/stats`, `/music`, `/achievements`, `/settings`) siguen existiendo como
redirects a su equivalente actual, por si hay enlaces viejos guardados.
