import { type AIProvider, type StreamCallbacks } from './types'
import { simulateStream, placeholderReply } from './simulate'

/**
 * Proveedor OpenAI (GPT-4o y familia).
 *
 * 🔌 PARA CONECTAR: ver el bloque comentado en `streamChat`. Este archivo
 * también exporta `readSSE`, un helper para leer respuestas Server-Sent Events
 * estilo OpenAI, reutilizable por Groq (que es compatible con su API).
 */
export const openaiProvider: AIProvider = {
  id: 'openai',
  label: 'OpenAI',
  docsUrl: 'https://platform.openai.com/docs',
  models: [
    { id: 'gpt-4o', label: 'GPT-4o', contextK: 128 },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', contextK: 128 },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', contextK: 128 },
  ],

  async streamChat(messages, config, cb) {
    // PLACEHOLDER (sin red):
    await simulateStream(placeholderReply(messages, 'OpenAI'), cb)
    //
    // 🔌 IMPLEMENTACIÓN REAL:
    // const API_KEY = config.apiKey
    // const res = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   signal: cb.signal,
    //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    //   body: JSON.stringify({
    //     model: config.model,
    //     temperature: config.temperature,
    //     max_tokens: config.maxTokens,
    //     stream: true,
    //     messages: [{ role: 'system', content: config.systemPrompt }, ...messages],
    //   }),
    // })
    // await readSSE(res, cb.onToken, cb.signal)
  },
}

/**
 * Lee un stream SSE (formato OpenAI/Groq: líneas `data: {json}` + `data: [DONE]`)
 * y entrega cada delta de texto a `onToken`. Helper compartido para cuando se
 * conecten los proveedores compatibles.
 */
export async function readSSE(
  res: Response,
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.ok || !res.body) {
    throw new Error(`La API respondió ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      return
    }
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) onToken(delta)
      } catch {
        /* fragmento parcial: se completará en la siguiente lectura */
      }
    }
  }
}

export type { StreamCallbacks }
