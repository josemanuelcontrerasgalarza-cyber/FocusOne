# FOCUSONE — WEEKLY UPDATE #1

**Fecha:** 23 de noviembre de 2026 · **Rama:** `claude/clever-allen-w8gj47` · **Versión base:** Kairo 6.0 (`10a209b`)

---

## 🔐 Seguridad

| # | Problema | Riesgo | Estado |
|---|---|---|---|
| 1 | `setup_all.sql` nunca eliminaba la policy `"Users see own profile"` (`FOR ALL`) del esquema v1. En una base que viniera de v1, cualquier usuario podía hacer `profiles.update({ is_developer: true })` y obtener diamantes ilimitados y acceso a las RPC `dev_*`. **Reproducido** en PostgreSQL local con el script original. | **Crítico (condicional)** | ✅ Corregido |
| 2 | `upgradeAccount` escribía `email` y `name` directamente en `profiles` desde el cliente; con la policy antigua, cualquiera podía poner el email de otra persona (suplantación en la búsqueda de amigos). | Alto | ✅ Corregido: el nombre va por la RPC `update_profile_name` y el email lo sincroniza un trigger desde `auth.users` (solo cuando Supabase lo confirma). |
| 3 | `post_review` se puede llamar directamente con la clave anónima y un `p_ip_hash` inventado → se saltaba el límite de 3/h y se podía inundar `reviews`. | Alto | ✅ Tope global de 30 opiniones/h + purga de `review_throttle`. |
| 4 | `close_mission`: crear y cerrar misiones en bucle daba puntos ilimitados (+ cuentas anónimas gratis). | Alto | ✅ Máx. 20 cierres con puntos cada 24 h (por encima se completa sin puntos). |
| 5 | `send_friend_request` creaba una notificación en cada llamada, aunque la solicitud ya existiera → spam a cualquier usuario. | Medio | ✅ Solo notifica solicitudes nuevas y limita a 20/h por remitente. |
| 6 | `/api/music/tracks`: proxy público sin límite de ritmo, consulta sin tope de longitud, sin timeout hacia Audius y host de Audius sin validar (llega de una lista externa). | Medio | ✅ 60 peticiones / 5 min por IP, consulta ≤ 100 caracteres, timeout de 8 s, solo hosts `https://` válidos. |
| 7 | `focus_sessions.actual_seconds` sin máximo (inflaba XP/estadísticas propias). | Bajo | ✅ `CHECK (actual_seconds <= 86400)`. |
| 8 | Dependencias: 8 vulnerabilidades (1 crítica en Next 15.5.19, altas en sharp, postcss, browserslist, nanoid, source-map-js). | Crítico | ✅ `npm audit` → **0 vulnerabilidades** (Next 15.5.29, sharp 0.35.5, PostCSS 8.5.33 también dentro de Next mediante `overrides`). |

**Sin corregir (requiere decisión tuya, ver abajo):**
- El rol developer se concede por **email fijo** en `setup_all.sql`. Si esa cuenta no existe y la confirmación por email está desactivada, quien se registre con ese correo recibiría el rol al volver a ejecutar el script. Riesgo medio.
- `send_friend_request` revela si un email tiene cuenta («No existe una cuenta con ese correo»). Riesgo bajo; cambiarlo empeora la UX.
- Funciones `SECURITY DEFINER` sin `REVOKE` explícito para `anon` (hoy sin impacto: con `auth.uid()` nulo no hacen nada).

**Secretos:** no se encontraron claves, tokens ni `.env` en el código ni en el historial de git. `.env*` está en `.gitignore`. `GROQ_API_KEY` solo se lee en el servidor.

## 🐛 Bugs

- **Encontrado y corregido:** en una instalación nueva, guardar una cuenta demo no actualizaba el nombre ni el email del perfil (el `update` directo sobre `profiles` lo bloqueaba la RLS sin dar error). Ahora el nombre se guarda por RPC y el email se sincroniza con el trigger.
- No se detectaron errores de JavaScript en los flujos probados.

## 👤 UX / Usuario

**Problema detectado:** «Tu siguiente movimiento» solo ofrecía *Empezar*, *Ya está hecha* o *Detalles*. Si la tarea recomendada abruma (algo muy habitual con dificultades de atención), no había salida: la misma tarea se quedaba fija y el usuario terminaba cerrando la app sin hacer nada.

**Mejora implementada:** botón **«Ahora no»** (ver siguiente sección).

Otros problemas detectados (para próximas semanas): no hay ESLint configurado; el modo local no avisa antes de borrar datos del navegador; la página de Tareas es larga en móvil.

## 🚀 Nueva funcionalidad — «Ahora no»

- **Qué se agregó:** un botón «Ahora no» en *Tu siguiente movimiento* (Inicio).
- **Por qué:** reducir la parálisis ante una tarea que abruma. Siempre hay un siguiente paso posible, en lugar de un bloqueo.
- **Cómo funciona:**
  - Aparta la recomendación **hasta mañana** y muestra al instante la siguiente mejor candidata, con sus motivos.
  - Aviso con **Deshacer**.
  - Enlace discreto «Has apartado N tareas hoy · mostrarlas de nuevo».
  - Si se aparta todo: «Has apartado todo por hoy. Descansar también cuenta», con *Ver de nuevo* o *Nueva tarea*.
  - Apartar una tarea con subtareas aparta también su paso concreto.
  - Se guarda en el navegador (`kairo:skip:v1`) y caduca solo al cambiar de día. No necesita migración ni ajustes.
- **Qué problema resuelve:** el usuario puede elegir entre opciones sin salir de la pantalla ni rebuscar en la lista de tareas. La app nunca se queda «atascada».
- **Código:** `nextMoveExcluding()` en `src/lib/kairo/priority.ts`, `src/lib/kairo/skips.ts` (lógica pura con pruebas), `src/components/home/useSkippedMoves.ts`, `HomeView.tsx`.

## ⚡ Rendimiento

- Sin regresiones: el tamaño de `/inicio` pasa de 8,97 kB a 9,82 kB (First Load 245 kB, igual).
- El proxy de música ya no puede quedarse colgado indefinidamente (timeout de 8 s).

## 🧪 Testing

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm test` (node:test) | ✅ **81/81** (75 previas + 6 nuevas de «Ahora no») |
| `npm run build` (con `npm ci` limpio) | ✅ |
| `npm audit` | ✅ 0 vulnerabilidades |
| Lint | ⚠️ No ejecutable: el proyecto no tiene ESLint configurado (`next lint` pide configurarlo) |
| SQL en PostgreSQL 16 local con stub de `auth` de Supabase | ✅ `setup_all.sql` se ejecuta dos veces seguidas (idempotente). Escalada a developer bloqueada (antes: reproducida). Email sincronizado desde `auth.users`. `update_profile_name` funciona. Opiniones: bloqueo en la 31.ª con hash aleatorio y en la 4.ª con el mismo hash. Amistad: 3 solicitudes → 1 notificación, y la aceptación mutua funciona. Misiones: 20 con puntos y 3 sin puntos, reintento idempotente correcto. `actual_seconds > 86400` rechazado. |
| E2E con Playwright (modo local, `next start`) | ✅ crear 3 tareas por captura en lenguaje natural, «Ahora no», aviso, persistencia tras recarga, apartar todo, «Ver de nuevo», «Deshacer», completar, editar título, eliminar con confirmación y persistencia del borrado, móvil 390 px sin scroll horizontal, 0 errores JS |
| `/api/music/tracks` | ✅ límite: 60 × 502, después 429 · consulta de 5000 caracteres aceptada y recortada. ⚠️ El sandbox no tiene salida a Audius (502), así que la búsqueda real **no** se probó de extremo a extremo |
| Cabeceras de seguridad (CSP, X-Frame-Options) | ✅ presentes |

**No probado:** registro/login con Supabase real y Google OAuth (no hay backend configurado en este entorno). La sincronización del email depende de que Supabase actualice `auth.users.email` al confirmar el correo.

## 📊 Estado general

| Área | Nota | Comentario |
|---|---|---|
| Seguridad | **8/10** | Sube desde ~6: dependencias limpias y RLS cerrada. Pendiente: rol dev por email y límites en memoria. |
| UX | **8/10** | Producto cuidado; «Ahora no» quita un bloqueo clave. |
| Rendimiento | **8/10** | Bundles razonables (~245 kB First Load). |
| Estabilidad | **8/10** | Tipos estrictos y pruebas de lógica. Sin pruebas de componentes ni E2E en CI. |
| Calidad del código | **7/10** | Buena separación lógica pura / UI. Faltan ESLint, código legado (missions/quiz/forge) y SQL duplicado entre migraciones y `setup_all`. |

## 🔮 Próxima semana

1. **Configurar ESLint** (`next/core-web-vitals`) y añadirlo a un workflow de CI junto con `typecheck`, `test` y `build`.
2. **Rol developer por UUID** en lugar de email (necesita tu decisión: ver abajo) y `REVOKE EXECUTE … FROM anon` explícito en las RPC.
3. **E2E automatizados** con Playwright en el repo (crear, completar, borrar tarea, enfoque y «Ahora no»), para no depender de pruebas manuales.
4. **Rate limiting persistente** (en Supabase) para el asistente y la música: el actual vive en memoria y es por instancia.
5. Revisar el **código legado** (missions/quiz/forge) para retirar lo que ya no se usa en Kairo.

---

### ⚠️ Acción necesaria por tu parte

1. **Ejecuta de nuevo `supabase/setup_all.sql`** (o solo `migrations/14_security_hardening.sql`) en el SQL Editor de Supabase. Sin esto, las correcciones de base de datos **no están activas en producción**.
2. **Decisión:** ¿quieres que el rol developer se asigne por el UUID de tu cuenta en lugar de por email? Si es que sí, indícame el UUID o confirma que lo saque de la consulta `select id from profiles where …` cuando lo ejecutes tú.
