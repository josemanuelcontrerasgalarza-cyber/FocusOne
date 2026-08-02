# FocusOne — Kratos Labs

> Termina lo que empiezas.

**La Fragua**: eliges una misión protagonista y la forjas. Un timer con barra de
calor mide tu enfoque, un quiz de cierre la sella, y una racha calculada siempre
en el servidor te mantiene volviendo.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** + **Framer Motion**
- **Supabase** (auth + Postgres + RLS) + **Zustand**

> `three` / `@react-three/fiber` siguen en `package.json` por el cosmos 3D del
> diseño anterior (`src/cosmos/`), pero ya no se monta en ninguna ruta viva —
> pendiente de retirar en una limpieza de código muerto.

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
3. Ejecuta `supabase/migrations/*.sql` en orden (01 a 09) en el SQL Editor de
   Supabase — son idempotentes, se pueden re-ejecutar sin riesgo.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing pública |
| `/login`, `/register` | Autenticación (o Modo Demo, sin cuenta) |
| `/hoy` | Centro de mando — misión activa, timer con calor, stats del día |
| `/misiones` | Crear, encender y borrar misiones |
| `/deep-work` | Sesiones de foco de 15/25/50/90 min o duración personalizada |
| `/musica` | Frecuencias de foco (Spotify) |
| `/progreso` | Racha, récord, puntos y misiones forjadas |
| `/perfil` | Accesos, tienda de recompensas y cierre de sesión |

Las rutas antiguas (`/app`, `/focus`, `/projects`, `/ideas`, `/stats`, `/music`,
`/achievements`, `/settings`) siguen existiendo solo como redirects a su
equivalente en La Fragua, para no romper enlaces guardados.
