/**
 * Punto de entrada único de la capa de IA de KRATOS.
 *
 * Uso típico:
 *   import { getProvider, useKratosSettings } from '@/services/ai'
 *   const { config } = useKratosSettings.getState()
 *   await getProvider(config.provider).streamChat(messages, config, { onToken })
 *
 * Para conectar un modelo real, abre el archivo del proveedor (groq.ts, etc.)
 * y descomenta el bloque marcado con 🔌. No hay que tocar nada más.
 */

export * from './types'
export { PROVIDERS, getProvider } from './providers'
export { useKratosSettings, DEFAULT_CONFIG } from './settings'
