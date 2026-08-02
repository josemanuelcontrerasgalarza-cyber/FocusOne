# FocusOne — Historial de actualizaciones semanales

Registro de las actualizaciones automáticas semanales (auditoría + fixes +
una mejora nueva por semana). Sirve para llevar la numeración y para que la
próxima ejecución sepa qué se hizo antes.

---

## WEEKLY UPDATE #1 — 2026-08-02

### 🔐 Seguridad

**Encontrado:**
- `profiles` tenía RLS habilitado pero **sin política de UPDATE** — el
  `UPDATE` que hace `authStore.upgradeAccount()` al guardar nombre/email se
  ejecutaba y no fallaba, pero tampoco escribía nada (Postgres deniega por
  defecto sin política), y el código no revisaba el error: el usuario veía
  "Cuenta guardada" aunque el perfil no se hubiera actualizado. Riesgo: alto
  (dato perdido silenciosamente, no expone otros usuarios).
- `signUp`/`upgradeAccount` revelaban con un mensaje distinto si un correo ya
  estaba registrado → enumeración de cuentas. Riesgo: medio.
- 3 vulnerabilidades altas en dependencias (`npm audit`): Next.js
  (DoS/SSRF/cache confusion/disclosure en Server Actions, corregido por
  next 15.5.19→15.5.19 y versiones previas), `sharp` (CVEs de libvips) y
  `postcss` (XSS/path traversal). Riesgo: alto.
- `reviews` acepta `INSERT` público (`anon`) sin auth ni rate limiting — el
  formulario de opiniones de la landing puede ser spameado directo con la
  anon key. **No se tocó**: puede ser intencional (opiniones sin registro) y
  cambiarlo (exigir auth) rompería esa función. Queda como decisión
  pendiente — ver "Próxima semana".

**Solucionado:**
- Política de UPDATE en `profiles` restringida a `auth.uid() = id`, con
  `GRANT UPDATE` limitado a las columnas `email, name, avatar_url` — así
  nadie puede escribir directo a `streak_current`/`streak_best` para
  falsificar su racha (esos campos son del trigger `SECURITY DEFINER`).
  Aplicado en `supabase/migrations/00_profiles.sql` y `supabase/setup_all.sql`.
- `authStore.upgradeAccount` ahora revisa el error del `UPDATE` a `profiles`
  y lo reporta en vez de mostrar éxito falso.
- Mensajes de "correo ya registrado" eliminados de `signUp`/`upgradeAccount`;
  ahora usan el mismo mensaje genérico que `signIn` (que ya lo hacía bien).
- `next` → 15.5.22, `sharp` forzado a `^0.35.0` vía `overrides` en
  `package.json`. De 3 vulnerabilidades altas quedó **1 pendiente**: el
  `postcss@8.4.31` que Next.js empaqueta internamente para su propio build
  (no es el `postcss` del proyecto, que ya está en 8.5.25). No se forzó un
  override sobre la copia interna de Next para no arriesgar romper su build;
  se resolverá solo cuando Next.js publique una versión con el bump. Riesgo
  residual: bajo (superficie de ataque es el pipeline de build, no runtime).
- Se auditó el repo completo por secretos/API keys hardcodeadas: **ninguna
  encontrada**. `.env.example` solo documenta la anon key pública (correcto,
  la seguridad real la da RLS).

**Nivel de riesgo tras esta actualización:** bajo-medio (queda pendiente la
decisión sobre `reviews` y el `postcss` interno de Next, ambos de riesgo bajo).

### 🐛 Bugs

**Encontrados y corregidos:**
- `projectStore.setMainProject`: el primer `UPDATE` (desmarcar la misión
  principal anterior) no revisaba su propio error antes de continuar — si
  fallaba, el segundo `UPDATE` podía dejar al usuario sin ninguna misión
  principal marcada hasta refrescar. Ahora se revisa y se aborta si falla.
- Racha inflada: `streak_current` solo se recalcula (y se corrige) al
  completar la próxima misión, así que un usuario inactivo seguía viendo su
  racha vieja aunque hubieran pasado varios días sin actividad — información
  engañosa justo para quien más necesita feedback honesto. Se agregó
  `effectiveStreak()` (`src/lib/dates.ts`), que muestra 0 si la última
  actividad no fue hoy ni ayer, y se aplicó en los 4 lugares donde se lee la
  racha para pantalla (`getProgressData`, `getHeaderStats`,
  `getDashboardData`, `getProgressDashboard`). No se tocó el cálculo del
  monto de la recompensa diaria (`daily.ts`) para no cambiar cuánto gana el
  usuario sin una decisión explícita — ver "Próxima semana".

**Encontrados, no corregidos esta semana (bajo impacto, quedan documentados):**
- `next lint` nunca se configuró en este proyecto (no hay `.eslintrc`/
  `eslint.config.*`) — el comando cae en el asistente interactivo de Next en
  vez de correr lint real. No se instaló nada nuevo sin decisión explícita.
- Duplicación menor de try/catch + toast entre `taskStore.ts`/`projectStore.ts`
  (7+ repeticiones del mismo patrón) — cosmético, no es un bug.

### 👤 UX / Usuario

**Detectado:**
- `CommandPalette` (⌘K) tiene navegación por teclado completa pero el ítem
  activo solo se comunicaba visualmente (color de fondo) — sin nada para
  lectores de pantalla.
- Ninguna señal si el usuario cambia de pestaña durante una sesión de Deep
  Work: al volver, se entera de que terminó por su cuenta, sin haber sabido
  el momento exacto — justo cuando más fácil es perder el impulso de pasar a
  la siguiente tarea (relevante para quienes tienen dificultad para sostener
  la atención, la audiencia que este producto busca ayudar).

**Mejorado:**
- `CommandPalette`: se agregaron `role="combobox"`/`"listbox"`/`"option"` y
  `aria-activedescendant` para que la navegación quede anunciada.

### 🚀 Nueva funcionalidad — Aviso de fin de sesión de Deep Work

**Qué se agregó:** `src/lib/sessionAlert.ts` + integración en
`(fragua)/deep-work/page.tsx`.

**Por qué:** el timer de Deep Work (25/50/90 min) no avisaba de ninguna forma
cuando terminaba si el usuario no estaba mirando la pestaña. Para gente con
dificultad para sostener el foco —que es exactamente para quién es la app—,
distraerse durante una sesión larga es lo esperable, y perder el momento en
que termina la sesión es perder la oportunidad de encadenar la siguiente
acción sin fricción.

**Cómo funciona:**
- Al completar una sesión de forma natural, siempre suena un chime de dos
  tonos (generado con Web Audio, sin archivos de sonido que mantener).
- Si la pestaña estaba en segundo plano (`document.hidden`), además: se
  dispara una notificación del navegador (si el usuario dio permiso — se
  pide, sin bloquear, al arrancar una sesión) y el título de la pestaña
  parpadea ("⏰ ¡Sesión completa!") hasta que vuelve a la pestaña o pasan 2
  minutos.
- Todo es best-effort: si el navegador bloquea `Notification` o `AudioContext`
  no hay ningún error visible, solo se pierde el aviso extra.

**Qué problema resuelve:** cierra el hueco entre "la sesión terminó" y "el
usuario se entera", que es donde se pierde la inercia para pasar a la
siguiente tarea — el objetivo central de la app.

### ⚡ Rendimiento

Sin cambios de rendimiento esta semana (no se detectaron problemas de
rendimiento en el código ni en el build). El build de producción sigue
compilando limpio (~15s) y el bundle no creció de forma perceptible (el
nuevo `sessionAlert.ts` no importa dependencias nuevas).

### 🧪 Testing

El proyecto **no tiene tests automatizados** (ni Jest/Vitest/Playwright
configurado, ni archivos `*.test.*`/`*.spec.*`) — esto ya era así antes de
esta actualización, se confirma como brecha pendiente.

Lo que sí se ejecutó y verificó esta semana:
- `npm run typecheck` (`tsc --noEmit`) → **sin errores**.
- `npm run build` (`next build`, producción) → **build exitoso**, 17
  páginas generadas, sin errores nuevos (solo un warning preexistente de
  `@supabase/supabase-js` sobre Edge Runtime, no relacionado con los cambios).
- `npm run lint` → no se pudo ejecutar como lint real: el proyecto nunca
  configuró ESLint, así que `next lint` cae en un asistente interactivo.
  Confirmado como brecha preexistente, no un resultado de esta actualización.
- `npm audit` antes/después → de 3 vulnerabilidades altas a 1 (ver Seguridad).
- Servidor de desarrollo (`npm run dev`) levantado y verificado con
  requests HTTP reales (código 200) a `/`, `/hoy`, `/deep-work`, `/progreso`
  y `/login` — sin errores en el log del servidor.
- **No se pudo probar** contra una base de datos Supabase real (no hay
  credenciales en este entorno) — los flujos de registro/login, CRUD de
  tareas/misiones y reclamo diario corren aquí sobre los datos "demo" de
  fallback del código, no contra Postgres/RLS reales. La migración de RLS de
  `profiles` se revisó por lectura cuidadosa (sintaxis SQL, orden de
  `REVOKE`/`GRANT`/política) pero no se ejecutó contra una instancia real de
  Supabase — recomendado correrla en un proyecto de prueba antes de aplicarla
  en producción.

### 📊 Estado general

| Área | Nota (1-10) |
|---|---|
| Seguridad | 7 (subió desde ~5; queda pendiente `reviews` público y el postcss interno de Next) |
| UX | 7 |
| Rendimiento | 8 (sin cambios, ya estaba bien) |
| Estabilidad | 8 (build y typecheck limpios, sin romper flujos existentes) |
| Calidad del código | 7 |

### 🔮 Próxima semana — prioridades propuestas

1. **Decisión pendiente:** ¿el formulario de opiniones (`reviews`) debe
   seguir aceptando envíos anónimos sin límite? Si sí, agregar al menos un
   límite razonable (p.ej. una función RPC con `rate limit` por IP/sesión
   vía Supabase Edge Function) en vez de `INSERT` directo con la anon key.
2. **Decisión pendiente:** ¿la recompensa diaria (`claim_daily`) debería
   also aplicar la misma lógica de "racha honesta" (`effectiveStreak`) al
   calcular el monto, o se deja como está porque ya se corrige sola al
   reclamar? Afecta cuánto gana el usuario, por eso no se tocó sin definirlo.
3. Configurar ESLint (`eslint.config.mjs` + `eslint-config-next`) para que
   `npm run lint` sirva de verdad — hoy es un placeholder.
4. Agregar un framework de tests mínimo (Vitest, por ejemplo) empezando por
   la lógica pura ya extraída en `src/lib/` (`effectiveStreak`, `dueLabel`,
   `dailyAmount`) — son funciones puras, fáciles de cubrir sin mockear Supabase.
5. Revisar y consolidar `supabase/schema.sql` (esquema legacy pre-"La
   Fragua", con políticas RLS `for all` más permisivas) frente a
   `supabase/setup_all.sql` — tener dos fuentes de verdad para el esquema de
   `profiles` es un riesgo de mantenimiento a futuro.
