# FocusOne / Kairo — Actualizaciones semanales

Registro de las actualizaciones semanales automáticas. La más reciente arriba.

---

## FOCUSONE — WEEKLY UPDATE #1 (2026-11-16)

### 🔐 Seguridad

| Problema | Riesgo | Estado |
|---|---|---|
| `next` 15.5.19 con avisos **críticos** (RCE en Image Optimization, SSRF, envenenamiento de caché, DoS en Server Actions) y dependencias transitivas vulnerables (`sharp`, `browserslist`, `nanoid`, `source-map-js`, `postcss`…) | Crítico | ✅ `npm audit fix` → `next` 15.5.29; rango mínimo subido a `^15.5.29`. De 8 avisos (1 crítico) quedan 2 |
| `post_review` concedida a `anon` con límite por IP basado en un hash **que envía quien llama**: cualquiera podía llamar a la RPC directamente con la clave anon y saltarse el límite | Alto | ✅ Tope global de 30 opiniones/hora que no depende del cliente + validación del hash + limpieza del registro |
| `send_friend_request` insertaba una notificación en cada llamada aunque la solicitud ya existiera → se podía inundar a cualquier usuario sabiendo su correo; sin límite (enumeración de correos); permitida a cuentas anónimas | Medio | ✅ Solo notifica solicitudes nuevas, 10 por hora como máximo, bloqueada para cuentas anónimas |
| Postgres concede EXECUTE a PUBLIC/`anon` en todas las funciones: las RPC podían invocarse sin sesión | Bajo (las funciones comprueban `auth.uid()`) | ✅ Revocado a `anon`/PUBLIC, concedido a `authenticated`; solo `post_review` sigue siendo pública |
| `/api/music/tracks` (pública) reenviaba a Audius búsquedas de cualquier longitud | Bajo | ✅ Modo en lista blanca y consulta limitada a 100 caracteres |

Sin cambios necesarios en: no hay secretos en el repo ni en el historial (solo `.env.example` vacío); las cabeceras de seguridad y la CSP están bien; el callback OAuth ya evita redirecciones abiertas; RLS activo en todas las tablas.

Pendiente (no corregido esta semana):
- `next` trae su propia copia de `postcss` 8.4.31 (aviso alto, solo en tiempo de build con CSS propio). Desaparece al migrar a Next 16.
- `close_mission` permite farmear puntos (crear → activar → cerrar en bucle). Es moneda del juego, sin dinero real, pero hace falta decidir un tope diario (decisión de producto).
- El límite del asistente es en memoria por instancia (en Vercel, cada instancia cuenta por separado).
- `setup_all.sql` incluye en claro el correo de la cuenta developer (no es un secreto, pero es un dato personal en el repo).

**Acción necesaria:** volver a ejecutar `supabase/setup_all.sql` (o solo `migrations/14_security_hardening.sql`) en Supabase para aplicar la parte SQL.

### 🐛 Bugs

- **Rollback optimista que borraba otros cambios** (corregido): si una mutación fallaba, el store restauraba la foto *completa* tomada al empezar. Con varias mutaciones en vuelo (marcar varias tareas seguidas, «pasar vencidas a hoy» en Calendario), el fallo de una revertía en pantalla también las que el servidor sí había guardado, y la UI quedaba desincronizada. Ahora se deshace solo el cambio fallido, campo a campo (`src/lib/kairo/rollback.ts`).
- **Copy incorrecto en Inicio** (corregido): «Tienes nada urgente para hoy» → «No tienes nada urgente para hoy» / «Tienes el día despejado».

### 👤 UX / Usuario

- Problema detectado: «Tu siguiente movimiento» solo ofrecía *Empezar*, *Ya está hecha* o *Detalles*. Si la tarea recomendada era demasiado para ese momento, la única salida era editarla o quedarse mirándola: justo el bloqueo que más afecta a quien tiene dificultades para mantener la atención.
- Implementado: «Ahora no» (ver abajo). En móvil, «Detalles» pasa a tocar el título (ya era un botón) para dejar sitio a la nueva acción sin recargar la tarjeta.

### 🚀 Nueva funcionalidad — «Ahora no»

- **Qué:** botón «Ahora no» en «Tu siguiente movimiento» (Inicio).
- **Cómo funciona:** aparta la tarea **solo por hoy** y muestra al momento la siguiente mejor candidata del mismo ranking explicable. El aviso trae «Deshacer». Debajo aparece «N tareas apartadas hoy · Mostrarlas de nuevo». Si se aparta todo: «Has apartado todo por hoy. Descansar también cuenta», con un botón para volver a verlas. Al cambiar de día la lista se vacía sola, así que nada queda escondido para siempre. Enfoque tampoco preselecciona una tarea apartada. Se guarda en el navegador (`localStorage`), con tolerancia a fallos.
- **Por qué / qué resuelve:** convierte el «no puedo con esto ahora» en una alternativa concreta en un toque, en vez de en abandono. Reduce la fricción para *empezar* sin culpa y sin tocar los datos de la tarea.
- **Código:** `lib/kairo/skips.ts` (lógica pura), `store/skipStore.ts`, `nextMove(tasks, ctx, skip)` en `lib/kairo/priority.ts`, `HomeView.tsx`, `FocusView.tsx`.

### ⚡ Rendimiento

Sin regresiones: first-load JS de `/inicio` 246 kB y de `/enfoque` 247 kB (igual que antes, ±1 kB). La reversión precisa solo trabaja en el camino de error. La limpieza de `review_throttle` evita que esa tabla crezca sin límite.

### 🧪 Testing

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ sin errores |
| `npm test` (node:test) | ✅ 82/82 (75 existentes + 7 nuevas: rollback, skips, `nextMove` con skip) |
| `npm run build` | ✅ compila |
| `npm audit` | 8 → 2 avisos (0 críticos); el resto exige Next 16 |
| SQL en PostgreSQL 16 local (stub de `auth` de Supabase) | ✅ `setup_all.sql` completo + migración 14, dos veces seguidas (idempotente). Comprobado: `anon` no puede ejecutar RPC salvo `post_review`; spam con 40 hashes distintos → solo 30 aceptadas; segunda solicitud de amistad → error y **una sola** notificación; aceptación mutua OK; cuenta anónima bloqueada; límite de 10 solicitudes/hora; `kairo_totals`, `update_profile_name`, `daily_claim_state` y `list_friends` siguen funcionando como `authenticated`; `dev_*` siguen rechazando cuentas que no son developer |
| E2E con Playwright (build de producción, modo local, escritorio + móvil 375 px) | ✅ crear tareas, «Ahora no» ×3 → estado «todo apartado», persiste tras recargar, «Ver de nuevo», «Ya está hecha», editar prioridad y persistencia tras recargar, eliminar con confirmación y persistencia, Enfoque respeta lo apartado, sin errores de consola |
| Lint | ⚠️ No ejecutado: el proyecto no tiene ESLint configurado (`next lint` pediría configurarlo) |
| Login/registro real con Supabase | ⚠️ No probado: este entorno no tiene credenciales de Supabase (las RPC sí se probaron directamente en Postgres) |

### 📊 Estado general

| Área | Nota |
|---|---|
| Seguridad | 7/10 |
| UX | 8/10 |
| Rendimiento | 7/10 |
| Estabilidad | 8/10 |
| Calidad del código | 7/10 |

### 🔮 Próxima semana

1. **Migrar a Next 16** (o forzar `postcss` con `overrides`) para cerrar los últimos avisos de `npm audit`.
2. **Tope diario de puntos en `close_mission`.** Necesita tu decisión: cuántos cierres al día dan puntos.
3. **Configurar ESLint + un smoke E2E en CI** (los flujos de Playwright de esta semana, convertidos en tests).
4. **Límite del asistente persistente** (Supabase) para que funcione bien con varias instancias en Vercel.
5. **Triaje de vencidas en Inicio:** reprogramar en bloque a mañana o elegir cuáles soltar, sin ir al Calendario.
