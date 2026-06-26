'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, KeyRound, RotateCcw, ShieldAlert } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { PROVIDERS, useKratosSettings } from '@/services/ai'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function KratosSettings() {
  const { config, hydrate, hydrated, update, setProvider, reset } = useKratosSettings()
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const provider = PROVIDERS.find((p) => p.id === config.provider) ?? PROVIDERS[0]

  if (!hydrated) {
    return <div className="mt-10 text-center text-sm text-ink-ghost">Cargando configuración…</div>
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="mt-2">
        <Link
          href="/kratos"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-ghost transition-colors hover:bg-white/[0.05] hover:text-ink"
        >
          <ArrowLeft size={13} /> KRATOS IA
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          Configuración de <span className="text-gradient">Kratos</span>
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Define el proveedor, el modelo y tu clave. Todo se guarda en este navegador.
        </p>
      </header>

      {/* Proveedor + modelo */}
      <GlassPanel className="p-5 card-accent-core" tilt={false}>
        <p className="mb-3 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">Proveedor</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm transition-all',
                config.provider === p.id
                  ? 'border-core/55 bg-core/10 text-core shadow-glow-core'
                  : 'border-glass-border bg-black/20 text-ink-dim hover:border-glass-border-hi hover:text-ink',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-5 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">Modelo</p>
        <select
          value={config.model}
          onChange={(e) => update({ model: e.target.value })}
          className="glass-input"
        >
          {provider.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.contextK ? ` · ${m.contextK}k` : ''}
            </option>
          ))}
        </select>
      </GlassPanel>

      {/* API key */}
      <GlassPanel className="p-5" tilt={false}>
        <div className="mb-2 flex items-center gap-2 text-ink-dim">
          <KeyRound size={15} className="text-solar" />
          <p className="font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">API Key</p>
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder={`Pega tu clave de ${provider.label}…`}
            className="glass-input pr-10 font-data"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-ghost transition-colors hover:text-ink"
            title={showKey ? 'Ocultar' : 'Mostrar'}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-core hover:underline"
        >
          ¿Dónde consigo mi clave de {provider.label}? →
        </a>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-solar/25 bg-solar/[0.07] px-3 py-2.5">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-solar" />
          <p className="text-[11px] leading-relaxed text-ink-dim">
            Tu clave se guarda solo en este navegador (localStorage). Para una app pública,
            enruta las llamadas por un backend y no expongas la clave en el cliente.
          </p>
        </div>
      </GlassPanel>

      {/* Parámetros */}
      <GlassPanel className="p-5" tilt={false}>
        <p className="mb-4 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">Parámetros</p>

        <div className="flex items-center justify-between">
          <label className="text-sm text-ink-dim">Temperatura</label>
          <span className="font-data text-sm text-core">{config.temperature.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.temperature}
          onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
          className="mt-2 w-full accent-core"
        />
        <p className="mt-1 text-[11px] text-ink-ghost">
          Menor = más preciso y determinista · Mayor = más creativo.
        </p>

        <div className="mt-5 flex items-center justify-between">
          <label className="text-sm text-ink-dim">Tokens máximos</label>
          <span className="font-data text-sm text-core">{config.maxTokens}</span>
        </div>
        <input
          type="range"
          min={256}
          max={8192}
          step={256}
          value={config.maxTokens}
          onChange={(e) => update({ maxTokens: parseInt(e.target.value, 10) })}
          className="mt-2 w-full accent-core"
        />
        <p className="mt-1 text-[11px] text-ink-ghost">Longitud máxima de cada respuesta.</p>
      </GlassPanel>

      {/* System prompt */}
      <GlassPanel className="p-5" tilt={false}>
        <p className="mb-2 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">System Prompt</p>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => update({ systemPrompt: e.target.value })}
          rows={4}
          className="glass-input resize-y leading-relaxed"
          placeholder="Personalidad e instrucciones base para Kratos…"
        />
      </GlassPanel>

      <div className="flex items-center justify-between pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset()
            toast.info('Configuración restablecida')
          }}
        >
          <RotateCcw size={14} /> Restablecer
        </Button>
        <span className="font-data text-[11px] text-ink-ghost">Cambios guardados automáticamente</span>
      </div>
    </div>
  )
}
