import { type AIProvider, type ProviderId } from './types'
import { groqProvider } from './groq'
import { openaiProvider } from './openai'
import { anthropicProvider } from './anthropic'
import { geminiProvider } from './gemini'

/** Lista ordenada de proveedores disponibles (para los selects de configuración). */
export const PROVIDERS: AIProvider[] = [
  groqProvider,
  openaiProvider,
  anthropicProvider,
  geminiProvider,
]

const PROVIDER_MAP: Record<ProviderId, AIProvider> = {
  groq: groqProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
}

/** Devuelve el proveedor por id (cae en Groq si el id no existe). */
export function getProvider(id: ProviderId): AIProvider {
  return PROVIDER_MAP[id] ?? groqProvider
}
