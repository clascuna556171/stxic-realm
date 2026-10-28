import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Channel = { id: string; name: string; space_id: string; archived_at:string|null;revision:number }
export type Message = import('./stream-repository').StreamMessage
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const client: SupabaseClient | null = url && key ? createClient(url, key,{auth:{flowType:'implicit',detectSessionInUrl:false}}) : null

// Realtime is a hint: the database remains the source of truth after every event.
export async function loadMessages(db: SupabaseClient, channelId: string): Promise<Message[]> {
  const { data, error } = await db.rpc('message_history',{p_kind:'channel',p_stream:channelId})
  if (error) throw error
  return data.messages as Message[]
}
export { sendMessage } from './message-repository'
