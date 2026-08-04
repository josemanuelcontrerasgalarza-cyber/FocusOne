import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'

export interface FriendUser {
  id: string
  name: string | null
  email: string
  points?: number
  streak?: number
}

export interface FriendsData {
  friends: FriendUser[]
  incoming: FriendUser[]
  outgoing: FriendUser[]
  isDemo: boolean
}

/** Amigos aceptados + solicitudes entrantes/salientes del usuario. */
export async function getFriends(): Promise<FriendsData> {
  const empty: FriendsData = { friends: [], incoming: [], outgoing: [], isDemo: true }
  if (!supabaseConfigured) return empty

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const { data } = await supabase.rpc('list_friends')
  const d = (data ?? {}) as {
    friends?: FriendUser[]
    incoming?: FriendUser[]
    outgoing?: FriendUser[]
  }
  return {
    friends: d.friends ?? [],
    incoming: d.incoming ?? [],
    outgoing: d.outgoing ?? [],
    isDemo: false,
  }
}
