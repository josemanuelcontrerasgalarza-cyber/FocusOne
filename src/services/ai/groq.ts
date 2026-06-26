import { type AIProvider } from './types'
import { simulateStream, placeholderReply } from './simulate'

/**
 * Proveedor Groq (OpenAI-compatible, ultrarrápido con Llama / Mixtral).
 *
 * 🔌 PARA CONECTAR DE VERDAD: reemplaza el cuerpo de `streamChat` por el bloque
 * comentado de abajo. No hace falta tocar ningún otro archivo.
 */
export const groqProvider: AIProvider = {
  id: 'groq',
  label: 'Groq',
  docsUrl: 'https://console.groq.com/docs',
  models: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', contextK: 128 },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (instant)', contextK: 128 },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', contextK: 32 },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B', contextK: 8 },
  ],

  async streamChat(messages, config, cb) {
    // —————————————————————————————————————————————————————————————
    // PLACEHOLDER (sin red): simula la respuesta para probar la UX.
    await simulateStream(placeholderReply(messages, 'Groq'), cb)
    // —————————————————————————————————————————————————————————————
    //
    // 🔌 IMPLEMENTACIÓN REAL — descomenta y borra el placeholder:
    //
    // const API_KEY = config.apiKey
    // const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    //   method: 'POST',
    //   signal: cb.signal,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     model: config.model,
    //     temperature: config.temperature,
    //     max_tokens: config.maxTokens,
    //     stream: true,
    //     messages: [
    //       { role: 'system', content: config.systemPrompt },
    //       ...messages,
    //     ],
    //   }),
    // })
    // await readSSE(res, cb.onToken, cb.signal)  // helper SSE compartido (ver openai.ts)
  },
}
