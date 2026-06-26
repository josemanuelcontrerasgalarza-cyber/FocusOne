import { create } from 'zustand'
import { type AIConfig, type ProviderId } from './types'
import { PROVIDERS } from './providers'

/**
 * Configuración de KRATOS IA, persistida en localStorage.
 *
 * ⚠️ Nota de seguridad: guardar la API key en localStorage es aceptable para
 * uso personal/local. En producción de cara al público conviene un proxy en el
 * backend para no exponer la clave al navegador.
 */

const STORAGE_KEY = 'focusone_kratos_ai_config'

export const DEFAULT_CONFIG: AIConfig = {
  provider: 'groq',
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt:
    'Eres Kratos, el copiloto de productividad de Focus-One. Ayudas al usuario a planificar, priorizar y completar sus misiones con respuestas claras, concisas y accionables en español.',
}

function load(): AIConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AIConfig>) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function persist(config: AIConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* almacenamiento no disponible */
  }
}

interface SettingsState {
  config: AIConfig
  /** Indica si ya se hidrató desde localStorage (evita parpadeos en SSR). */
  hydrated: boolean
  hydrate: () => void
  update: (patch: Partial<AIConfig>) => void
  /** Cambiar de proveedor reajusta el modelo al primero disponible. */
  setProvider: (provider: ProviderId) => void
  reset: () => void
  isConnected: () => boolean
}

export const useKratosSettings = create<SettingsState>((set, get) => ({
  config: DEFAULT_CONFIG,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    set({ config: load(), hydrated: true })
  },

  update: (patch) => {
    const next = clamp({ ...get().config, ...patch })
    set({ config: next })
    persist(next)
  },

  setProvider: (provider) => {
    const prov = PROVIDERS.find((p) => p.id === provider)
    const model = prov?.models[0]?.id ?? get().config.model
    const next = { ...get().config, provider, model }
    set({ config: next })
    persist(next)
  },

  reset: () => {
    set({ config: DEFAULT_CONFIG })
    persist(DEFAULT_CONFIG)
  },

  isConnected: () => get().config.apiKey.trim().length > 0,
}))

function clamp(c: AIConfig): AIConfig {
  return {
    ...c,
    temperature: Math.max(0, Math.min(2, c.temperature)),
    maxTokens: Math.max(64, Math.min(8192, Math.round(c.maxTokens))),
  }
}
