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
| `/app` | Centro de mando — misión principal, telemetría, objetivos |
| `/focus` | **Modo Deep Work** — sesiones de foco de 25/50/90 min |
| `/projects` | Misiones (proyectos) |
| `/ideas` | Bóveda de ideas |
| `/stats` | Telemetría de rendimiento |
| `/music` | Frecuencias de foco (Spotify) |
| `/settings` | Configuración |

### La Fragua

Experiencia paralela de misiones diarias con timer, quiz de cierre, racha,
puntos y tienda de recompensas. Es el destino tras iniciar sesión.

| Ruta | Descripción |
|---|---|
| `/hoy` | Dashboard "Hoy" — misión activa, timer y estadísticas del día |
| `/misiones` | Gestor de misiones (crear, activar, forjar) |
| `/progreso` | Racha, récord y puntos acumulados |
| `/perfil` | Accesos rápidos + tienda de recompensas |
| `/musica` | Frecuencias de foco (Spotify) |
