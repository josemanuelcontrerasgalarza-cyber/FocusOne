# FocusOne — Kratos Labs

> Termina lo que empiezas.

## Stack

- React 18 + Vite + TypeScript, Tailwind CSS v3, Supabase, Zustand, React Hook Form + Zod, Recharts, Lucide React, date-fns

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Configurar base de datos
# Ejecutar supabase/schema.sql en el SQL Editor de Supabase

# 4. Iniciar
npm run dev
```

## Despliegue en Vercel

Agregar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el panel de Vercel. El archivo `vercel.json` ya está configurado.
