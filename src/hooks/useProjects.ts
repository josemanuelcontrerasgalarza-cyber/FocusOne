import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useAuth } from './useAuth'

export function useProjects() {
  const { user } = useAuth()
  const store = useProjectStore()

  useEffect(() => {
    if (user?.id) {
      store.fetchProjects(user.id)
    }
  }, [user?.id])

  return store
}
