import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Channel = { id: string; name: string; space_id: string }
export type Message = { id: string; channel_id: string; author_id: string; body: string; created_at: string; client_id: string }
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const client: SupabaseClient | null = url && key ? createClient(url, key) : null

// Realtime is a hint: the database remains the source of truth after every event.
export async function loadMessages(db: SupabaseClient, channelId: string): Promise<Message[]> {
  const { data, error } = await db.from('messages').select('id,channel_id,author_id,body,created_at,client_id').eq('channel_id', channelId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100)
  if (error) throw error
  return (data as Message[]).reverse()
}
export { sendMessage } from './message-repository'
