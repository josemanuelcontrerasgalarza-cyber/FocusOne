import { useEffect } from 'react'
import { useIdeaStore } from '../store/ideaStore'
import { useAuth } from './useAuth'

export function useIdeas() {
  const { user } = useAuth()
  const store = useIdeaStore()

  useEffect(() => {
    if (user?.id) {
      store.fetchIdeas(user.id)
    }
  }, [user?.id])

  return store
}
