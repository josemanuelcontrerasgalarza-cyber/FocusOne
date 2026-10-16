'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText } from 'lucide-react'
import { StarRating } from './StarRating'
import { useReviewStore } from '@/store/reviewStore'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/primitives'

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Opiniones públicas y anónimas: resumen, formulario y lista. */
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
    <div className="flex flex-col gap-5">
      {/* Resumen */}
      <div className="flex items-end gap-3">
        <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.03em] text-ink">
          {reviews.length ? avg.toFixed(1) : '—'}
        </span>
        <div className="pb-0.5">
          {reviews.length > 0 && <StarRating value={Math.round(avg)} readOnly size={13} />}
          <p className="mt-0.5 text-xs text-ink-faint">
            {reviews.length > 0
              ? `${reviews.length} ${reviews.length === 1 ? 'opinión' : 'opiniones'}`
              : 'Todavía sin opiniones'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-ink">Tu valoración</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <label className="sr-only" htmlFor="review-name">
          Tu nombre (opcional)
        </label>
        <input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          maxLength={40}
          className="k-input"
        />
        <label className="sr-only" htmlFor="review-comment">
          Tu opinión
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te parece Kairo?"
          maxLength={500}
          rows={3}
          className="k-input resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-ink-faint">{comment.length}/500</span>
          <Button
            type="submit"
            variant="secondary"
            loading={submitting}
            disabled={comment.trim().length < 3}
            icon={<MessageSquareText size={15} />}
          >
            {submitting ? 'Enviando…' : 'Publicar opinión'}
          </Button>
        </div>
        {!available && (
          <p className="text-[12px] text-warning" role="status">
            Las opiniones todavía no están activadas en este servidor.
          </p>
        )}
      </form>

      {/* Lista */}
      {reviews.length > 0 ? (
        <ul className="-mx-1 flex max-h-80 flex-col gap-2 overflow-y-auto px-1">
          <AnimatePresence initial={false}>
            {reviews.map((r) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-card border border-line bg-surface p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">{r.name?.trim() || 'Anónimo'}</span>
                  <StarRating value={r.rating} readOnly size={12} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{r.comment}</p>
                <p className="mt-1.5 font-mono text-[11px] text-ink-faint">{relativeDate(r.created_at)}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        available && (
          <EmptyState
            compact
            icon={<MessageSquareText size={17} />}
            title="Aún no hay opiniones"
            description="Las opiniones son anónimas y públicas. Si ya lo has probado, cuéntanos qué te parece."
          />
        )
      )}
    </div>
  )
}
