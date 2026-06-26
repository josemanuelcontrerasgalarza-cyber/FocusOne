import { type AIProvider } from './types'
import { simulateStream, placeholderReply } from './simulate'

/**
 * Proveedor Anthropic (Claude). Su API de streaming usa eventos SSE con un
 * formato propio (`content_block_delta`), por eso no comparte el `readSSE` de
 * OpenAI; abajo queda el esqueleto específico.
 *
 * 🔌 PARA CONECTAR: ver el bloque comentado en `streamChat`.
 */
export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  label: 'Anthropic',
  docsUrl: 'https://docs.anthropic.com',
  models: [
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', contextK: 200 },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', contextK: 200 },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextK: 200 },
  ],

  async streamChat(messages, config, cb) {
    // PLACEHOLDER (sin red):
    await simulateStream(placeholderReply(messages, 'Anthropic'), cb)
    //
    // 🔌 IMPLEMENTACIÓN REAL:
    // const API_KEY = config.apiKey
    // const res = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   signal: cb.signal,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-api-key': API_KEY,
    //     'anthropic-version': '2023-06-01',
    //   },
    //   body: JSON.stringify({
    //     model: config.model,
    //     system: config.systemPrompt,
    //     max_tokens: config.maxTokens,
    //     temperature: config.temperature,
    //     stream: true,
    //     messages: messages.map((m) => ({ role: m.role, content: m.content })),
    //   }),
    // })
    // // Parsear SSE: eventos `content_block_delta` → json.delta.text
  },
}
