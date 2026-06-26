import { type AIProvider } from './types'
import { simulateStream, placeholderReply } from './simulate'

/**
 * Proveedor Google Gemini. Usa `streamGenerateContent` y un esquema de cuerpo
 * distinto (roles `user`/`model`, `parts[]`).
 *
 * 🔌 PARA CONECTAR: ver el bloque comentado en `streamChat`.
 */
export const geminiProvider: AIProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  docsUrl: 'https://ai.google.dev/docs',
  models: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contextK: 1000 },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', contextK: 2000 },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', contextK: 1000 },
  ],

  async streamChat(messages, config, cb) {
    // PLACEHOLDER (sin red):
    await simulateStream(placeholderReply(messages, 'Google Gemini'), cb)
    //
    // 🔌 IMPLEMENTACIÓN REAL:
    // const API_KEY = config.apiKey
    // const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${API_KEY}`
    // const res = await fetch(url, {
    //   method: 'POST',
    //   signal: cb.signal,
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     systemInstruction: { parts: [{ text: config.systemPrompt }] },
    //     generationConfig: { temperature: config.temperature, maxOutputTokens: config.maxTokens },
    //     contents: messages.map((m) => ({
    //       role: m.role === 'assistant' ? 'model' : 'user',
    //       parts: [{ text: m.content }],
    //     })),
    //   }),
    // })
    // // Parsear SSE: json.candidates[0].content.parts[0].text
  },
}
