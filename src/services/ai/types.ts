/**
 * Contratos compartidos de la capa de IA de KRATOS.
 *
 * Toda la app habla con la IA a través de la interfaz `AIProvider`. Cambiar de
 * proveedor (Groq, OpenAI, Anthropic, Gemini) es solo cambiar un id — el resto
 * del código no se entera. Esto sigue el patrón Strategy: cada proveedor es una
 * estrategia intercambiable detrás del mismo contrato.
 */

export type ProviderId = 'groq' | 'openai' | 'anthropic' | 'gemini'

export interface AIModel {
  id: string
  label: string
  /** Ventana de contexto aproximada en miles de tokens (solo informativo). */
  contextK?: number
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface AIMessage {
  role: ChatRole
  content: string
}

/** Configuración editable por el usuario (se guarda en localStorage). */
export interface AIConfig {
  provider: ProviderId
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export interface StreamCallbacks {
  /** Se invoca por cada fragmento de texto recibido del modelo. */
  onToken: (chunk: string) => void
  /** Permite cancelar la respuesta en curso (botón "detener"). */
  signal?: AbortSignal
}

/**
 * Contrato de un proveedor de IA. Implementaciones actuales son placeholders
 * que simulan streaming localmente (sin red). Para conectar uno real basta con
 * rellenar `streamChat` con el `fetch` correspondiente (ver cada archivo).
 */
export interface AIProvider {
  id: ProviderId
  label: string
  /** Endpoint base — documentado para cuando se conecte la API real. */
  docsUrl: string
  models: AIModel[]
  streamChat(messages: AIMessage[], config: AIConfig, cb: StreamCallbacks): Promise<void>
}
