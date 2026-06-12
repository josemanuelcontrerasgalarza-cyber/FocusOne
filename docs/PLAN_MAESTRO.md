# FocusOne — Auditoría Técnica y Plan Maestro AI-First

> Documento estratégico. Objetivo: convertir FocusOne en la plataforma de productividad
> impulsada por IA más avanzada del mercado, con arquitectura 100% basada en Groq y
> modelos open source. Horizonte: 1M de usuarios.

---

## 0. Veredicto ejecutivo

**El producto actual es un prototipo bien ejecutado, no una plataforma.** Es un CRUD
limpio de proyectos/tareas/ideas con rachas, construido en ~1.500 líneas. Eso es un
mérito para un MVP de fin de semana, pero ninguna pieza del sistema actual soporta la
visión AI-First, ni la gamificación es defendible, ni existe el núcleo del producto.

Tres verdades incómodas:

1. **FocusOne no tiene función de foco.** La app se llama FocusOne, su lema es
   "Termina lo que empiezas", y no existe ni timer, ni pomodoro, ni modo deep work,
   ni bloqueo de distracciones. El núcleo de la propuesta de valor no está construido.
   Lo que sí está construido (CRUD de tareas) es exactamente lo que Todoist, Notion y
   otras 500 apps ya hacen mejor.

2. **Toda la lógica de negocio vive en el navegador y es falsificable.** Rachas,
   estadísticas y progreso se calculan en el cliente con la anon key de Supabase.
   Cualquier usuario puede ponerse `streak_current = 9999` con una llamada REST.
   En un producto cuyo motor de retención es la gamificación, esto invalida el
   sistema entero. **Se reconstruye desde cero en el servidor. No es opcional.**

3. **No hay capa de servidor.** Sin Next.js, sin API routes, sin Edge Functions, sin
   colas, sin cron. No hay dónde poner la IA, los webhooks de hardware, ni los jobs
   de análisis. La migración a Next.js no es una mejora: es el prerequisito de todo
   lo demás.

**Qué se salva:** el esquema visual/UX básico como referencia, el modelo de datos
conceptual (projects/tasks/ideas/daily_stats es razonable), la elección de Supabase,
y la disciplina de TypeScript estricto. **Qué se reconstruye:** el shell de la app
(Vite SPA → Next.js), toda la lógica de gamificación (cliente → SQL/triggers/RPC),
la capa de datos del frontend (Zustand manual → TanStack Query + tipos generados),
y el schema (v2 con enums, índices, auditoría y vectores).

---

## 1. Auditoría técnica completa

### 1.1 Inventario

| Capa | Estado actual | Evaluación |
|---|---|---|
| Frontend | Vite 8 + React 19 + TS 6, SPA pura | Moderno pero arquitectura equivocada para la visión |
| Routing | react-router-dom 7, imports estáticos | Sin code-splitting, un solo bundle |
| Estado | 4 stores Zustand acoplados entre sí | Sin caché, sin deduplicación, sin optimistic updates reales |
| Backend | Supabase directo desde el cliente | Cero lógica server-side salvo un trigger |
| DB | 5 tablas, RLS básico, 1 índice explícito | Sin índices en FKs, sin enums, sin `updated_at`, sin vectores |
| IA | **Inexistente** | — |
| Hardware | **Inexistente** | — |
| Tests | **0 tests, sin CI** | Riesgo crítico para iterar rápido |
| Observabilidad | **Ninguna** (sin Sentry, sin analytics) | Volamos a ciegas |
| PWA | `manifest.json` sin service worker | Instalable pero no offline: PWA de mentira |
| Docs | README desactualizado (dice React 18, es React 19) | Drift desde el primer mes |

### 1.2 Hallazgos concretos en el código

- `src/store/taskStore.ts:20-77` (`updateStreak`): la racha se calcula en el cliente
  con **5 round-trips secuenciales** y un read-modify-write sin atomicidad. Dos
  pestañas abiertas = conteos perdidos. Y se ejecuta con la fecha local del
  dispositivo (`format(new Date(), 'yyyy-MM-dd')`), mientras `daily_stats.date`
  usa `current_date` del servidor: dos relojes distintos para el mismo dato.
- `src/store/taskStore.ts` (`completeTask`): completar una tarea encadena
  update de tarea → refetch de todas las tareas del proyecto → update de proyecto →
  select de daily_stats → update/insert → select de profile → update de profile →
  refetch de profile. **8+ requests secuenciales para marcar un checkbox.**
- `src/store/projectStore.ts` (`updateProgress`): descarga todas las tareas del
  proyecto para contar completadas. Es un `COUNT(*)` hecho en JavaScript. El error
  se traga en silencio (`// silencioso`).
- `src/store/projectStore.ts` (`setMainProject`): dos UPDATEs sin transacción.
  Si el segundo falla, el usuario se queda sin proyecto principal. Además compite
  con el índice único parcial `one_main_project_per_user` en condiciones de carrera.
- `src/store/authStore.ts` (`initialize`): `onAuthStateChange` se registra dentro de
  una función llamada desde `useEffect` sin cleanup → en StrictMode se suscribe dos
  veces y nunca se desuscribe. Además refetchea el perfil completo en cada
  `TOKEN_REFRESHED` (cada hora).
- `src/App.tsx`: las 9 páginas se importan estáticamente → recharts (~100 KB gzip)
  y los embeds de Spotify viajan en el bundle inicial de todos los usuarios.
  `if (!initialized) return null` produce un flash blanco en cada guard.
- `src/types/index.ts`: tipos de la DB escritos a mano en vez de generados con
  `supabase gen types` → garantía de drift silencioso entre schema y frontend.
- Stores acoplados en grafo: `taskStore` importa `projectStore` y `authStore`.
  Es el embrión de un acoplamiento circular.
- **Bug funcional de rachas:** la racha solo se recalcula al completar una tarea.
  Un usuario inactivo 30 días sigue viendo `streak_current = 12` hasta que toca
  algo. La racha nunca "se rompe" visiblemente — el mecanismo psicológico central
  de la gamificación está roto.

### 1.3 Problemas de arquitectura (resumen crítico)

1. **Cliente gordo, servidor inexistente.** Decisión raíz equivocada para un
   producto AI-First. La IA, los webhooks MQTT, el análisis y la gamificación
   necesitan servidor. Veredicto: **reconstruir el shell sobre Next.js.**
2. **Confianza en el cliente para datos de juego.** Veredicto: **reconstruir en
   SQL (triggers + RPC + RLS de solo lectura sobre columnas de stats).**
3. **Estado manual sin caché.** Zustand usado como caché de servidor improvisada.
   Veredicto: **TanStack Query para estado de servidor; Zustand solo para estado
   de UI (timer, modales, preferencias).**
4. **Sin capa de dominio.** Llamadas Supabase esparcidas en stores. Veredicto:
   capa `services/` tipada + RPCs nombradas (`complete_task()`, `set_main_project()`).
5. **Sin contratos.** Cero tests, cero CI, tipos a mano. Veredicto: Vitest +
   Playwright + tipos generados + GitHub Actions desde la semana 1.

### 1.4 Problemas de UX

1. **Ausencia del momento de valor.** No hay sesión de foco. El usuario gestiona
   tareas pero la app nunca le ayuda a *ejecutarlas*. Es el gap número uno.
2. **Sin onboarding.** Registro → dashboard vacío. Ningún "aha moment" guiado.
3. **Latencia percibida.** Toasts tras `await`: cada acción se siente lenta porque
   la UI espera al servidor (sin optimistic UI consistente).
4. **Sin undo.** Borrar un proyecto cascadea y destruye todas sus tareas sin
   posibilidad de recuperación (sin soft delete en schema).
5. **Sin offline, sin atajos de teclado, sin command palette, sin i18n.** Para un
   público de productividad, ⌘K no es un lujo: es la expectativa base.
6. **Errores como toasts genéricos** ("Error al cargar tareas") sin recuperación
   ni reintento.

### 1.5 Problemas de rendimiento

| Problema | Evidencia | Impacto |
|---|---|---|
| Bundle monolítico | Imports estáticos en `App.tsx` | TTI alto en móvil; recharts siempre presente |
| Cascadas de requests | `completeTask` = 8+ requests seriales | ~1-2 s para un checkbox en 4G |
| Agregaciones en JS | `updateProgress` descarga filas para contar | O(n) red por acción; no escala |
| Sin caché de datos | Refetch manual en cada navegación | Datos repetidos, spinners repetidos |
| Iframes de Spotify | `MusicPage` + `MusicWidget` (204 líneas) | Terceros pesados sin lazy-load estricto |
| Sin paginación | Ninguna query la usa | Usuario con 2.000 tareas descarga 2.000 tareas |

### 1.6 Problemas de escalabilidad

1. **Incrementos no atómicos** en `daily_stats` y `profiles` → datos corruptos con
   concurrencia trivial (dos dispositivos).
2. **Sin jobs ni cron** → imposible: romper rachas a medianoche, digests, análisis
   nocturno, predicción de abandono.
3. **Sin colas** → la IA y el hardware necesitan trabajo asíncrono (no se puede
   sostener un agente en el request del navegador).
4. **Sin índices en FKs** (`tasks(project_id)`, `tasks(user_id)`,
   `projects(user_id)`, `ideas(user_id)`) → seq scans en cuanto haya volumen.
5. **Sin Realtime** → multi-dispositivo desincronizado; el hardware lo exige.

### 1.7 Riesgos de seguridad

| # | Riesgo | Severidad | Detalle |
|---|---|---|---|
| S1 | **Gamificación falsificable** | **Crítica (integridad)** | RLS `FOR ALL USING (auth.uid() = id)` en `profiles` permite al usuario hacer UPDATE de `streak_*` y `tasks_completed_total` con la anon key. Leaderboards/recompensas futuras nacerían muertas. |
| S2 | Políticas RLS monolíticas | Alta | Una sola política `FOR ALL` por tabla, sin `WITH CHECK` explícito ni separación SELECT/INSERT/UPDATE/DELETE. `tasks` permite insertar con `project_id` de otro usuario (integridad cross-tenant débil). |
| S3 | Sin headers de seguridad | Alta | `vercel.json` no define CSP, HSTS, X-Frame-Options, Permissions-Policy. |
| S4 | Sin rate limiting ni captcha | Media | Registro y login abiertos a abuso/bots; crítico cuando cada usuario tenga presupuesto de tokens de IA. |
| S5 | Sin observabilidad de seguridad | Media | Sin Sentry, sin logs de auditoría: un incidente sería invisible. |
| S6 | `email` editable en profiles | Baja | El UPDATE libre sobre la fila propia incluye `email`, divergiendo de `auth.users`. |

---

## 2. Arquitectura objetivo (v2)

### 2.1 Diagrama

```
┌────────────────────────────────────────────────────────────────────┐
│  CLIENTES                                                          │
│  Next.js 15 (App Router, RSC) · PWA offline · Voice UI            │
│  React 19 + TS · Tailwind v4 + shadcn/ui · Framer Motion          │
│  TanStack Query (server state) · Zustand (UI state)               │
└───────────────┬──────────────────────────────┬─────────────────────┘
                │ HTTPS / Server Actions       │ WebSocket (Realtime)
┌───────────────▼──────────────────────────────▼─────────────────────┐
│  CAPA DE APLICACIÓN (Vercel)                                       │
│  Route Handlers + Server Actions (Node) · Edge runtime para chat   │
│  Vercel AI SDK (streaming, tools)  ←→  GROQ API                    │
│  Upstash Redis: rate limit · caché de prompts · presupuestos       │
│  Upstash QStash / pg_cron: jobs (rachas, digests, predicción)      │
└───────────────┬────────────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────────────┐
│  SUPABASE                                                          │
│  Postgres 16 + pgvector (RAG/memoria) · RLS granular               │
│  RPCs: complete_task() · set_main_project() · log_focus_event()    │
│  Triggers: progreso, rachas, XP — TODO server-side                 │
│  Realtime: sync multi-dispositivo + canal de hardware              │
│  Edge Functions: embeddings (gte-small, open source, local)        │
└───────────────┬────────────────────────────────────────────────────┘
                │ Realtime WS / MQTT bridge (EMQX Cloud)
┌───────────────▼────────────────────────────────────────────────────┐
│  HARDWARE — FocusOne Pulse (ESP32)                                 │
│  OLED (tarea actual, timer) · LED ring (estado de foco)            │
│  Botón físico (iniciar/parar deep work) · sensor presencia/lux     │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Capa de IA sobre Groq (sin OpenAI, garantizado)

**Stack:** Vercel AI SDK + provider oficial de Groq (`@ai-sdk/groq`). Cero SDKs ni
endpoints de OpenAI. Embeddings con modelos open source ejecutados en Supabase Edge
Functions (`gte-small`), porque Groq no ofrece endpoint de embeddings.

**Enrutador de modelos (model router):** cada petición se clasifica y se envía al
modelo más barato capaz de resolverla. Esta es la clave para que el coste por usuario
sea ~10x menor que el de competidores que lo mandan todo a un modelo frontier.

| Tarea | Modelo en Groq | Por qué |
|---|---|---|
| Kratos AI (agente, tool calling) | Llama 4 Maverick / Kimi K2 | Mejor tool-use y contexto largo |
| Planificación semanal, razonamiento | DeepSeek R1 Distill Llama 70B | Razonamiento profundo barato |
| Triage barato (prioridad, etiquetas, intención) | Llama 3.1 8B Instant / Gemma 2 9B | Centavos por millón de tokens, <100 ms |
| Multilingüe / resúmenes | Qwen (QwQ-32B / Qwen 2.5) | Excelente ES/EN |
| Voz → texto | Whisper large-v3-turbo *servido por Groq* (modelo open source, sin API de OpenAI) | STT casi en tiempo real |
| Texto → voz | PlayAI TTS en Groq | Coach hablado |

*(Verificar nombres exactos del catálogo de Groq en el momento de implementar; el
catálogo rota rápido.)*

**Por qué Groq es ventaja competitiva y no solo un proveedor:** la latencia de
inferencia (300-800 tokens/s) habilita una categoría de producto que los demás no
pueden copiar fácilmente: **coaching en tiempo real durante la sesión de foco**.
Un coach que responde en 4 segundos es un chatbot; uno que responde en 300 ms es
una presencia. Eso, más el coste por token de modelos open source, permite ofrecer
IA generosa en el plan gratuito — el growth loop que OpenAI-wrappers no pueden
financiar.

**Memoria persistente + RAG:**
- Tabla `memories` (pgvector): hechos sobre el usuario extraídos por un modelo barato
  tras cada interacción ("trabaja mejor 9-11 am", "abandona tareas de >2 h",
  "le motiva el progreso visual"). Recuperación por similitud + recencia + decay.
- Tabla `events` (append-only): cada acción del usuario (tarea creada/completada/
  pospuesta, sesión de foco, pausa, abandono) — es a la vez el log de auditoría,
  el corpus del RAG conductual y el dataset para los modelos predictivos. **Este
  dataset longitudinal de comportamiento de foco es el moat real**: nadie puede
  copiarlo sin años de usuarios.

### 2.3 Schema v2 (cambios clave)

- Enums nativos (`task_status`, `project_status`, `priority`) en vez de `text + check`.
- `updated_at` + trigger en todas las tablas; soft delete (`deleted_at`) en projects/tasks.
- Índices en todas las FKs y en `(user_id, status)`, `(user_id, due_date)`.
- `focus_sessions` (inicio, fin, modo, interrupciones, device_id, calidad).
- `events` append-only + `memories` con `embedding vector(384)`.
- `xp_ledger` (libro mayor de XP/recompensas: solo INSERT vía trigger, nunca UPDATE).
- `devices` (ESP32 emparejados, token rotativo, last_seen).
- **RLS granular:** políticas separadas por operación; columnas de stats/XP de solo
  lectura para el cliente (se actualizan únicamente vía `SECURITY DEFINER` RPCs);
  `tasks.project_id` validado contra ownership con subquery en `WITH CHECK`.
- `pg_cron`: job de medianoche por zona horaria del usuario que rompe rachas y
  materializa stats. La zona horaria vive en `profiles.timezone` — se acabó el
  reloj del navegador.

### 2.4 Hardware — FocusOne Pulse (ESP32)

- **Transporte:** MQTT (EMQX Cloud serverless, TLS) con bridge a Supabase Realtime;
  fallback de WebSocket directo. Aprovisionamiento por QR + token de dispositivo rotativo.
- **Loop físico:** empiezas deep work en la app (o pulsando el botón físico) → el
  LED ring se enciende en rojo (no molestar) y el OLED muestra la tarea y el timer →
  el sensor de presencia detecta que te fuiste 10 min → Kratos lo registra como
  interrupción → al completar, el ring hace una animación de celebración.
- **Por qué importa:** el hardware convierte el hábito digital en ritual físico
  (anclaje conductual, el principio de Atomic Habits de "hazlo visible") y es una
  barrera de copia brutal para competidores software-only. Además: el dispositivo
  en el escritorio es marketing permanente.

---

## 3. Funciones innovadoras (con valor, complejidad, coste e impacto)

Escala de coste: 🟢 < 1 semana-persona · 🟡 2-4 semanas · 🔴 > 1 mes.

| # | Función | Valor para el usuario | Complejidad | Coste | Impacto esperado |
|---|---|---|---|---|---|
| 1 | **Kratos AI** — agente principal con tool calling (crear/planificar/replanificar tareas y proyectos por lenguaje natural, voz o texto), memoria persistente y RAG conductual | Deja de gestionar la herramienta; hablas y se organiza sola. "Kratos, planifícame la semana" | Alta | 🔴 | ⭐⭐⭐⭐⭐ Diferenciador central; driver de activación y retención |
| 2 | **Modo Deep Work** — sesiones de foco con timer, intención declarada, bloqueo de notificaciones, música integrada y registro en `focus_sessions` | El momento de valor que hoy no existe; convierte la lista en ejecución | Media | 🟡 | ⭐⭐⭐⭐⭐ Es EL producto; sin esto no hay FocusOne |
| 3 | **Sistema anti-procrastinación** — detecta patrones (tarea pospuesta 3+ veces, creada hace >14 días, sesiones abandonadas) y actúa: la trocea con IA en subtareas de 25 min, propone el mejor hueco horario, o sugiere matarla honestamente | Ataca la causa (tarea ambigua/grande), no el síntoma | Media | 🟡 | ⭐⭐⭐⭐ Retención; titular de prensa |
| 4 | **Predicción de abandono de tareas** — score 0-1 por tarea (heurísticas v1 → modelo entrenado con `events` en v2) visible como "riesgo" y usado por Kratos para intervenir antes | "Esta tarea tiene 82% de riesgo de morir. ¿La partimos?" | Alta | 🔴 | ⭐⭐⭐⭐ Moat de datos; nadie más tiene el dataset |
| 5 | **Coach de foco en tiempo real** — durante la sesión, con la latencia de Groq: micro-intervenciones (<300 ms) ante pausas largas o cambios de contexto; check-in de mitad de sesión por voz | Una presencia, no un chatbot. Solo posible con inferencia ultra-rápida | Alta | 🔴 | ⭐⭐⭐⭐ Imposible de copiar con APIs lentas |
| 6 | **FocusOne Pulse (ESP32)** — feedback físico: LED ring de estado, OLED con tarea/timer, botón de inicio, sensor de presencia | Ritual físico + señal social ("no molestar" visible) + datos de presencia reales | Alta | 🔴 | ⭐⭐⭐⭐ Moat físico; ARPU extra por hardware; comunidad maker |
| 7 | **Voice Assistant** — Whisper-turbo (STT) + PlayAI (TTS) en Groq; captura de ideas y comandos manos libres, brief matinal hablado | Captura sin fricción; accesibilidad | Media | 🟡 | ⭐⭐⭐ Wow-factor de demo; uso diario moderado |
| 8 | **Dashboard ejecutivo** — informe semanal generado por DeepSeek R1: horas de foco real vs. planificado, horas pico personales, tendencia de rachas, "una decisión para la semana que viene" | De datos a decisión en una pantalla; compartible (growth loop) | Baja-Media | 🟡 | ⭐⭐⭐ Retención semanal + viralidad del share |
| 9 | **Sistema de recompensas (XP ledger)** — XP server-side e infalsificable, niveles, logros, recompensas variables (refuerzo intermitente, no calendario fijo) y racha "amable" (1 token de protección/semana, como Duolingo) | Progreso visible y justo; la racha no castiga la vida real | Media | 🟡 | ⭐⭐⭐⭐ Retención D30; requiere S1 resuelto |
| 10 | **Análisis de productividad con IA** — correlaciones personales: música vs. ritmo de completado, duración óptima de sesión, día/hora pico; alimenta a Kratos y al dashboard | "Tu sesión óptima son 42 min con lo-fi a las 9:30" — personalización real | Media | 🟡 | ⭐⭐⭐ Sustrato de las funciones 1, 3, 4 y 5 |

**Coste de inferencia estimado (Groq, modelos open source, con router):** usuario
activo ≈ 50-150k tokens/día mayoritariamente en modelos de 8-9B → **$0.30-1.00/usuario/mes**
para usuarios intensivos. Viable incluso en plan gratuito con presupuestos en Redis.

---

## 4. Plan de modernización por fases

### FASE 1 — MVP (semanas 1-6) · "El producto que debió ser"

**Objetivo:** núcleo de foco + Kratos v1 sobre base técnica sana. Métrica: activación
(primera sesión de deep work completada) > 40% de registros.

1. **Semana 1-2 — Reconstrucción del shell.** Migrar a Next.js 15 App Router
   (Turborepo: `apps/web`, `packages/db`, `packages/ai`). Tailwind v4 + shadcn/ui +
   Framer Motion. TanStack Query + tipos generados de Supabase. CI (lint, typecheck,
   Vitest, Playwright smoke) desde el día 1. Sentry + PostHog.
2. **Semana 2-3 — Schema v2 + seguridad.** Migración SQL completa (enums, índices,
   `focus_sessions`, `events`, `xp_ledger`, RLS granular, RPCs `complete_task`/
   `set_main_project`, pg_cron de rachas con timezone). Headers de seguridad y rate
   limiting (Upstash). **Cierra S1-S6.**
3. **Semana 3-4 — Modo Deep Work.** Timer + intención + música + registro de sesión
   + animación de cierre. Optimistic UI en todas las mutaciones.
4. **Semana 4-6 — Kratos AI v1.** Chat con streaming (Vercel AI SDK + Groq), tool
   calling sobre 6 herramientas (crear/listar/completar/trocear tareas, planificar
   día, iniciar sesión), memoria v0 (últimas N interacciones + perfil). Onboarding
   conversacional: Kratos te configura el primer proyecto.

### FASE 2 — BETA (semanas 7-14) · "Inteligencia y cuerpo"

**Objetivo:** retención D30 > 25%; 500-2.000 usuarios beta; lista de espera de hardware.

- RAG + memoria persistente completa (pgvector + extracción de hechos + decay).
- Anti-procrastinación v1 (heurísticas + troceo IA) y score de abandono v1.
- Sistema de recompensas server-side (XP ledger, logros, racha amable).
- Voice Assistant (captura + brief matinal).
- Dashboard ejecutivo semanal (email + in-app, compartible).
- **Pulse alpha:** 50 unidades para beta testers maker (PCB de referencia + firmware
  open source — comunidad como canal de distribución).
- PWA real: service worker, offline-first para tareas y timer.

### FASE 3 — LANZAMIENTO (semanas 15-22) · "Salir a ganar"

**Objetivo:** lanzamiento público (Product Hunt + comunidad maker); 25.000 usuarios;
conversión a pago > 4%.

- Coach en tiempo real durante sesiones (el demo que enseña la latencia de Groq).
- Monetización: Free (IA con presupuesto) / Pro $8-10 mes (IA ilimitada con router,
  análisis profundo, voz) / Pulse bundle (hardware + Pro anual).
- Performance budget: LCP < 1.5 s, bundle inicial < 150 KB, streaming UI en todo.
- Hardening: pentest externo, auditoría RLS, backups verificados, runbooks.
- i18n ES/EN completo (nacemos bilingües: ventaja en LatAm + España, mercado
  desatendido por las apps de productividad US-first).
- Growth loops: informe semanal compartible, referidos con XP, integración
  calendario (Google Calendar bidireccional).

### FASE 4 — ESCALAMIENTO (mes 6-18) · "Camino al millón"

**Objetivo:** 1M usuarios registrados, 100k MAU, infra < $0.15/MAU/mes.

- **Datos:** particionado de `events` por mes, read replicas, agregados
  materializados; pipeline de features → modelo propio de predicción de abandono
  entrenado con el dataset longitudinal (el moat se vuelve compuesto).
- **Infra IA:** caché semántica de respuestas en Redis, batch nocturno de análisis,
  fine-tuning de un modelo pequeño (Llama 8B / Gemma) con interacciones de coaching
  mejor valoradas — un coach propio que nadie más tiene.
- **Producto:** FocusOne Teams (B2B: focus rooms compartidos, analítica de equipo
  sin vigilancia — ángulo ético como diferenciador), API pública + webhooks,
  marketplace de automatizaciones, segunda generación de Pulse.
- **Organización:** SOC 2 Type I, on-call, feature flags + experimentación (el
  dashboard de PostHog decide, no las opiniones).

---

## 5. Ventajas competitivas difíciles de copiar (resumen)

1. **Dataset conductual longitudinal** (`events` + `focus_sessions`): los modelos
   predictivos mejoran con cada usuario; un competidor empieza de cero.
2. **Latencia Groq como categoría de producto**: coaching en tiempo real no es
   replicable con proveedores lentos/caros sin romper su unit economics.
3. **Loop hardware-software** (Pulse): ritual físico + datos de presencia + barrera
   de ejecución (firmware, supply chain) que las apps no cruzan.
4. **Unit economics open source**: router de modelos → IA generosa en free tier →
   growth loop que los wrappers de modelos frontier no pueden financiar.
5. **Memoria del coach**: cambiar de app costaría "perder a alguien que te conoce".
   Switching cost emocional, no funcional.

---

*Anexo de implementación inmediata: la Fase 1 comienza con la migración del shell y
el schema v2. Ningún feature nuevo debe construirse sobre la base actual de Vite +
lógica en cliente.*
