import { useEffect } from 'react'
import { useTaskStore } from '../store/taskStore'

export function useTasks(projectId: string | undefined) {
  const store = useTaskStore()

  useEffect(() => {
    if (projectId) {
      store.fetchTasks(projectId)
    }
  }, [projectId])

  return store
}
