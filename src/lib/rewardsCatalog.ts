import type { Reward } from '@/types'

/**
 * Catálogo de recompensas en CÓDIGO (no en la BD), para que siempre se vea sin
 * seed. La BD solo guarda qué desbloqueó el usuario (reward_unlocks). El costo
 * lo valida la RPC unlock_reward en el servidor.
 */
export const REWARDS_CATALOG: Reward[] = [
  { id: 'pl-lluvia', name: 'Playlist Lluvia', description: 'Ruido blanco para foco profundo', type: 'playlist', cost_points: 40, icon: '🌧️', created_at: '' },
  { id: 'pl-synthwave', name: 'Playlist Synthwave', description: 'Una frecuencia extra para tus sprints', type: 'playlist', cost_points: 50, icon: '🎧', created_at: '' },
  { id: 'th-medianoche', name: 'Tema Medianoche', description: 'Canvas aún más oscuro', type: 'theme', cost_points: 80, icon: '🌑', created_at: '' },
  { id: 'th-brasa', name: 'Tema Brasa', description: 'Skin ember intensificada', type: 'theme', cost_points: 120, icon: '🔥', created_at: '' },
  { id: 'bd-herrero', name: 'Insignia Herrero', description: 'Distintivo por tu constancia', type: 'badge', cost_points: 200, icon: '🛠️', created_at: '' },
  { id: 'bd-racha30', name: 'Insignia Racha 30', description: 'Para forjadores implacables', type: 'badge', cost_points: 300, icon: '🏅', created_at: '' },
]
