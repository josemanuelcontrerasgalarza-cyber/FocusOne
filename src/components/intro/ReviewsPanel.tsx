'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, Star } from 'lucide-react'
import { StarRating } from './StarRating'
import { useReviewStore } from '@/store/reviewStore'

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function ReviewsPanel() {
  const { reviews, available, submitting, fetchReviews, addReview } = useReviewStore()
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
  }, [reviews])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await addReview({ name, rating, comment })
    if (ok) {
      setComment('')
      setName('')
      setRating(5)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-semibold text-ink">
            {reviews.length ? avg.toFixed(1) : '—'}
          </span>
          <Star size={16} className="fill-solar text-solar" />
        </div>
        <div className="text-xs text-ink-ghost">
          {reviews.length > 0
            ? `${reviews.length} opinión${reviews.length > 1 ? 'es' : ''}`
            : 'Sé el primero en opinar'}
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-glass-border bg-black/20 p-3">
        <div className="flex items-center justify-between">
          <span className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">Tu valoración</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          maxLength={40}
          className="glass-input"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te parece FocusOne?"
          maxLength={500}
          rows={2}
          className="glass-input resize-none"
        />
        <button
          type="submit"
          disabled={submitting || comment.trim().length < 3}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-core to-plasma px-4 py-2 text-sm font-medium text-void transition-all hover:opacity-90 hover:shadow-glow-core disabled:opacity-40"
        >
          <MessageSquarePlus size={15} />
          {submitting ? 'Enviando…' : 'Publicar opinión'}
        </button>
        {!available && (
          <p className="text-center text-[11px] text-solar">
            Las opiniones se activarán al ejecutar la migración 05 en Supabase.
          </p>
        )}
      </form>

      {/* Lista */}
      <div className="flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-glass-border bg-black/15 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-dim">{r.name?.trim() || 'Anónimo'}</span>
                <StarRating value={r.rating} readOnly size={13} />
              </div>
              <p className="mt-1 text-sm text-ink-dim">{r.comment}</p>
              <p className="mt-1 font-data text-[10px] text-ink-ghost">{relativeDate(r.created_at)}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {available && reviews.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-ghost">Aún no hay opiniones. ¡Anímate!</p>
        )}
      </div>
    </div>
  )
}
