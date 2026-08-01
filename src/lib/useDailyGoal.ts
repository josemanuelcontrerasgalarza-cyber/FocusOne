'use client'

import { useCallback, useEffect, useState } from 'react'

const KEY = (userId: string) => `focusone_daily_goal_${userId}`
const DEFAULT_GOAL = 3

/**
 * Meta diaria de objetivos a completar. Se guarda por usuario en localStorage
 * (preferencia personal, no requiere base de datos).
 */
export function useDailyGoal(userId: string | undefined) {
  const [goal, setGoalState] = useState(DEFAULT_GOAL)

  useEffect(() => {
    if (!userId) return
    try {
      const raw = localStorage.getItem(KEY(userId))
      if (raw) setGoalState(Math.max(1, parseInt(raw, 10) || DEFAULT_GOAL))
    } catch {
      /* noop */
    }
  }, [userId])

  const setGoal = useCallback(
    (value: number) => {
      const v = Math.max(1, Math.min(20, Math.round(value)))
      setGoalState(v)
      if (userId) {
        try {
          localStorage.setItem(KEY(userId), String(v))
        } catch {
          /* noop */
        }
      }
    },
    [userId],
  )

  return { goal, setGoal }
}
