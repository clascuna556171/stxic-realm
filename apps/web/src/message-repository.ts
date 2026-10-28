import type { SupabaseClient } from '@supabase/supabase-js'

export async function sendMessage(db: SupabaseClient, channelId: string, userId: string, body: string, clientId: string) {
  // The database derives the author and checks a committed retry before charging quota.
  void userId
  const { error } = await db.rpc('message_send',{p_kind:'channel',p_stream:channelId,p_body:body,p_client:clientId})
  if (error) throw error
}
