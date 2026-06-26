'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Settings2, PanelLeft, X } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { useAuthStore } from '@/store/authStore'
import { useKratosChatStore } from '@/store/kratosChatStore'
import { useKratosSettings } from '@/services/ai'
import { SidebarChat } from './SidebarChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingAnimation } from './ThinkingAnimation'
import { PromptSuggestions } from './PromptSuggestions'

export function KratosWorkspace() {
  const user = useAuthStore((s) => s.user)
  const hydrate = useKratosSettings((s) => s.hydrate)
  const isConnected = useKratosSettings((s) => s.isConnected())
  const {
    conversations, activeId, messages, isStreaming, thinking, streamingText,
    fetchConversations, selectConversation, newConversation, deleteConversation,
    renameConversation, sendMessage, stopStreaming,
  } = useKratosChatStore()

  const [input, setInput] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (user?.id) fetchConversations(user.id)
  }, [user?.id, fetchConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText, thinking])

  function handleSend() {
    if (!user?.id || !input.trim() || isStreaming) return
    const text = input
    setInput('')
    void sendMessage(user.id, text)
  }

  function handleSelect(id: string) {
    void selectConversation(id)
    setDrawerOpen(false)
  }

  function handleNew() {
    newConversation()
    setDrawerOpen(false)
  }

  const sidebar = (
    <SidebarChat
      conversations={conversations}
      activeId={activeId}
      onSelect={handleSelect}
      onNew={handleNew}
      onDelete={(id) => void deleteConversation(id)}
      onRename={(id, t) => void renameConversation(id, t)}
    />
  )

  const empty = messages.length === 0 && !isStreaming

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] gap-4 lg:h-[calc(100vh-5.5rem)]">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <GlassPanel className="h-full p-3" tilt={false} delay={0.05}>
          {sidebar}
        </GlassPanel>
      </aside>

      {/* Drawer — móvil */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <motion.div
              className="absolute inset-y-0 left-0 w-72 p-3"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="glass-panel flex h-full flex-col p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-data text-[11px] uppercase tracking-wider text-ink-ghost">Conversaciones</span>
                  <button onClick={() => setDrawerOpen(false)} className="text-ink-ghost hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                {sidebar}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Columna de chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera */}
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg border border-glass-border p-1.5 text-ink-dim transition-colors hover:text-ink lg:hidden"
              title="Conversaciones"
            >
              <PanelLeft size={16} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-core to-plasma text-void shadow-glow-core">
              <BrainCircuit size={18} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight">KRATOS IA</h1>
              <p className="font-data text-[10px] uppercase tracking-[0.18em] text-ink-ghost">
                {isConnected ? 'Conectado' : 'Modo demostración'}
              </p>
            </div>
          </div>
          <Link
            href="/kratos/settings"
            className="flex items-center gap-2 rounded-xl border border-glass-border px-3 py-1.5 text-sm text-ink-dim transition-all hover:border-glass-border-hi hover:text-ink"
          >
            <Settings2 size={15} /> <span className="hidden sm:inline">Configuración</span>
          </Link>
        </header>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto rounded-2xl">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-core to-plasma text-void shadow-glow-core"
              >
                <BrainCircuit size={30} />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Hola, soy <span className="text-gradient">Kratos</span>
                </h2>
                <p className="mt-1 text-sm text-ink-dim">
                  Tu copiloto de productividad. ¿En qué te ayudo hoy?
                </p>
              </div>
              <PromptSuggestions onPick={(t) => setInput(t)} />
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 px-1 py-2">
              {messages.map((m) => (
                <ChatMessage key={m.id} role={m.role} content={m.content} />
              ))}
              {isStreaming && thinking && <ThinkingAnimation />}
              {isStreaming && !thinking && (
                <ChatMessage role="assistant" content={streamingText} streaming />
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="mx-auto mt-3 w-full max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stopStreaming}
            streaming={isStreaming}
            disabled={!user}
          />
        </div>
      </div>
    </div>
  )
}
