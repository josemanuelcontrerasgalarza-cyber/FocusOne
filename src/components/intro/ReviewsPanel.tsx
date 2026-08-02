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

const inputCls =
  'w-full rounded-lg border border-forge-line bg-forge-canvas px-3 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50'

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
          <span className="font-num text-3xl font-semibold text-forge-ink">
            {reviews.length ? avg.toFixed(1) : '—'}
          </span>
          <Star size={16} className="fill-metal text-metal" />
        </div>
        <div className="text-xs text-forge-ink-faint">
          {reviews.length > 0
            ? `${reviews.length} opinión${reviews.length > 1 ? 'es' : ''}`
            : 'Sé el primero en opinar'}
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-forge border border-forge-line bg-forge-surface p-3">
        <div className="flex items-center justify-between">
          <span className="font-num text-[10px] uppercase tracking-wider text-forge-ink-faint">Tu valoración</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          maxLength={40}
          className={inputCls}
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te parece FocusOne?"
          maxLength={500}
          rows={2}
          className={`${inputCls} resize-none`}
        />
        <button
          type="submit"
          disabled={submitting || comment.trim().length < 3}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-4 py-2 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-40"
        >
          <MessageSquarePlus size={15} />
          {submitting ? 'Enviando…' : 'Publicar opinión'}
        </button>
        {!available && (
          <p className="text-center text-[11px] text-metal">
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
              className="rounded-forge border border-forge-line bg-forge-surface/60 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-forge-ink-dim">{r.name?.trim() || 'Anónimo'}</span>
                <StarRating value={r.rating} readOnly size={13} />
              </div>
              <p className="mt-1 text-sm text-forge-ink-dim">{r.comment}</p>
              <p className="mt-1 font-num text-[10px] text-forge-ink-faint">{relativeDate(r.created_at)}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {available && reviews.length === 0 && (
          <p className="py-4 text-center text-sm text-forge-ink-faint">Aún no hay opiniones. ¡Anímate!</p>
        )}
      </div>
    </div>
  )
}
