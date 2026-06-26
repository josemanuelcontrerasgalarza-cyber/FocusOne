# Capa de IA — KRATOS

Arquitectura desacoplada (patrón Strategy) para que la app hable con cualquier
proveedor de IA a través de un único contrato. Hoy los proveedores son
**placeholders** que simulan streaming localmente; toda la UX ya funciona sin
conexión.

## Estructura

| Archivo | Rol |
|---|---|
| `types.ts` | Contratos: `AIProvider`, `AIMessage`, `AIConfig`, `StreamCallbacks`. |
| `simulate.ts` | Streaming simulado local (cancelable) + respuesta placeholder. |
| `providers.ts` | Registro `PROVIDERS` + `getProvider(id)`. |
| `groq.ts` · `openai.ts` · `anthropic.ts` · `gemini.ts` | Una estrategia por proveedor. |
| `settings.ts` | Config del usuario (`useKratosSettings`) persistida en localStorage. |
| `index.ts` | Punto de entrada único (`@/services/ai`). |

## Conectar un proveedor real (2 pasos)

1. Abre el archivo del proveedor (p. ej. `groq.ts`).
2. Borra la línea del placeholder (`await simulateStream(...)`) y descomenta el
   bloque marcado con `🔌`. La API key se lee de `config.apiKey` (que el usuario
   pone en **KRATOS IA → Configuración**).

No hay que tocar componentes ni el store: el resto del código depende solo del
contrato `AIProvider`.

## Cambiar de proveedor

Es solo cambiar `config.provider`. El store de configuración reajusta el modelo
al primero disponible del nuevo proveedor automáticamente.

## Seguridad

La API key vive en localStorage (cómodo para uso personal). Para producción de
cara al público, enruta las llamadas por un proxy en el backend y nunca expongas
la clave en el cliente.
