import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { getProvider, useKratosSettings } from '@/services/ai'
import { type KratosConversation, type KratosMessage } from '@/types'

/**
 * Estado del chat de KRATOS IA. Persiste en Supabase (kratos_conversations /
 * kratos_messages) y orquesta el streaming a través de la capa @/services/ai.
 *
 * El streaming es hoy simulado localmente (sin API). Mientras dura, conduce el
 * orbe 3D existente (useCosmos) a 'thinking' → 'speaking' → 'idle' como guiño
 * premium, sin tocar su store.
 *
 * Es tolerante a que las tablas aún no existan: degrada a memoria local con un
 * aviso, sin romper la app.
 */

interface ChatState {
  conversations: KratosConversation[]
  activeId: string | null
  messages: KratosMessage[]
  isStreaming: boolean
  thinking: boolean
  streamingText: string
  loading: boolean
  loadingMessages: boolean
  fetchConversations: (userId: string) => Promise<void>
  selectConversation: (id: string) => Promise<void>
  newConversation: () => void
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  sendMessage: (userId: string, text: string) => Promise<void>
  stopStreaming: () => void
}

let abortController: AbortController | null = null
let warnedPersist = false

function localMessage(
  conversationId: string,
  userId: string,
  role: KratosMessage['role'],
  content: string,
): KratosMessage {
  return {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    created_at: new Date().toISOString(),
  }
}

function warnPersistOnce() {
  if (warnedPersist) return
  warnedPersist = true
  toast.info('Chat en modo local — ejecuta la migración 04 en Supabase para guardar el historial.')
}

export const useKratosChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  isStreaming: false,
  thinking: false,
  streamingText: '',
  loading: false,
  loadingMessages: false,

  fetchConversations: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('kratos_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) {
      set({ loading: false })
      return
    }
    set({ conversations: data ?? [], loading: false })
  },

  selectConversation: async (id) => {
    if (get().activeId === id) return
    set({ activeId: id, messages: [], loadingMessages: true })
    const { data } = await supabase
      .from('kratos_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    set({ messages: data ?? [], loadingMessages: false })
  },

  newConversation: () => {
    // Creación diferida: la fila se inserta al enviar el primer mensaje,
    // así no quedan conversaciones vacías.
    set({ activeId: null, messages: [], streamingText: '' })
  },

  deleteConversation: async (id) => {
    await supabase.from('kratos_conversations').delete().eq('id', id)
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      ...(state.activeId === id ? { activeId: null, messages: [] } : {}),
    }))
  },

  renameConversation: async (id, title) => {
    const clean = title.trim() || 'Nueva conversación'
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title: clean } : c)),
    }))
    await supabase.from('kratos_conversations').update({ title: clean }).eq('id', id)
  },

  sendMessage: async (userId, text) => {
    const content = text.trim()
    if (!content || get().isStreaming) return

    // 1. Garantizar conversación (creación diferida).
    let convId = get().activeId
    if (!convId) {
      const title = content.length > 40 ? content.slice(0, 40) + '…' : content
      const { data, error } = await supabase
        .from('kratos_conversations')
        .insert({ user_id: userId, title })
        .select()
        .single()
      if (error || !data) {
        warnPersistOnce()
        const local: KratosConversation = {
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        convId = local.id
        set((s) => ({ conversations: [local, ...s.conversations], activeId: local.id, messages: [] }))
      } else {
        convId = data.id
        set((s) => ({ conversations: [data, ...s.conversations], activeId: data.id, messages: [] }))
      }
    }
    if (!convId) return // garantizado arriba; satisface el narrowing de TS

    // 2. Mensaje del usuario.
    const { data: userMsg, error: userErr } = await supabase
      .from('kratos_messages')
      .insert({ conversation_id: convId, user_id: userId, role: 'user', content })
      .select()
      .single()
    if (userErr) warnPersistOnce()
    const userMessage = userMsg ?? localMessage(convId, userId, 'user', content)
    set((s) => ({ messages: [...s.messages, userMessage] }))

    // 3. Streaming de la respuesta.
    abortController = new AbortController()
    set({ isStreaming: true, thinking: true, streamingText: '' })
    useCosmos.getState().setKratosState('thinking')

    const history = get().messages.map((m) => ({ role: m.role, content: m.content }))
    const { config } = useKratosSettings.getState()

    let acc = ''
    try {
      await getProvider(config.provider).streamChat(history, config, {
        signal: abortController.signal,
        onToken: (chunk) => {
          acc += chunk
          if (get().thinking) {
            set({ thinking: false })
            useCosmos.getState().setKratosState('speaking')
          }
          set({ streamingText: acc })
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar la respuesta')
    }

    // 4. Persistir respuesta (incluido el parcial si se detuvo).
    set({ isStreaming: false, thinking: false, streamingText: '' })
    useCosmos.getState().setKratosState('idle')
    abortController = null

    const finalText = acc.trim()
    if (finalText) {
      const { data: aMsg } = await supabase
        .from('kratos_messages')
        .insert({ conversation_id: convId, user_id: userId, role: 'assistant', content: finalText })
        .select()
        .single()
      const assistantMessage = aMsg ?? localMessage(convId, userId, 'assistant', finalText)
      set((s) => ({ messages: [...s.messages, assistantMessage] }))

      const now = new Date().toISOString()
      await supabase.from('kratos_conversations').update({ updated_at: now }).eq('id', convId)
      set((s) => ({
        conversations: [...s.conversations]
          .map((c) => (c.id === convId ? { ...c, updated_at: now } : c))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      }))
    }
  },

  stopStreaming: () => {
    abortController?.abort()
  },
}))
