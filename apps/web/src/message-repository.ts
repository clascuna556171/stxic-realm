import type { SupabaseClient } from '@supabase/supabase-js'

export async function sendMessage(db: SupabaseClient, channelId: string, userId: string, body: string, clientId: string) {
  const { error } = await db.from('messages').insert({ channel_id: channelId, author_id: userId, body, client_id: clientId })
  if (error?.code === '23505') {
    const { data, error: lookupError } = await db.from('messages').select('channel_id,body').eq('author_id', userId).eq('client_id', clientId).maybeSingle()
    if (!lookupError && data?.channel_id === channelId && data?.body === body) return
  }
  if (error) throw error
}
