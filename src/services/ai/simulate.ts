import { type AIMessage, type StreamCallbacks } from './types'

/**
 * Emite un texto fragmento a fragmento con pequeños retrasos, imitando el
 * streaming de un modelo real. Es cancelable vía `AbortSignal`, así que el
 * botón "detener" funciona de verdad aunque todavía no haya API conectada.
 *
 * Cuando conectes un proveedor real, esta función deja de usarse para ese
 * proveedor; sirve mientras tanto para construir y probar toda la UX.
 */
export async function simulateStream(text: string, cb: StreamCallbacks): Promise<void> {
  // Trocea respetando palabras para que el efecto se vea natural.
  const tokens = text.match(/\S+\s*/g) ?? [text]
  for (const token of tokens) {
    if (cb.signal?.aborted) return
    await delay(18 + Math.random() * 34)
    if (cb.signal?.aborted) return
    cb.onToken(token)
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Respuesta placeholder contextual: usa el último mensaje del usuario para
 * generar una contestación creíble en markdown (con encabezados y un bloque de
 * código) que demuestra el renderizador. Se reemplaza por la respuesta real del
 * modelo en cuanto se conecta una API.
 */
export function placeholderReply(messages: AIMessage[], providerLabel: string): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() ?? ''
  const topic = lastUser.length > 80 ? lastUser.slice(0, 77) + '…' : lastUser || 'tu consulta'

  return `Entiendo que quieres hablar sobre **${topic}**.

> ⚙️ _Estás en modo demostración._ KRATOS IA todavía no está conectado a ningún modelo. Esta respuesta es **simulada localmente** para que pruebes la interfaz completa (streaming, markdown, código y copiar).

### Cómo activarme de verdad
1. Abre **KRATOS IA → Configuración**.
2. Elige proveedor (\`${providerLabel}\`), modelo y pega tu **API key**.
3. Listo: las respuestas pasarán a ser reales.

Mientras tanto, aquí tienes un ejemplo de bloque de código:

\`\`\`ts
// Conectar un proveedor es trivial gracias al patrón Strategy
import { getProvider } from '@/services/ai'

const provider = getProvider(config.provider)
await provider.streamChat(messages, config, {
  onToken: (chunk) => append(chunk),
})
\`\`\`

¿Quieres que te ayude a **organizar tus misiones**, **planificar tu semana** o **resumir tu progreso**?`
}
