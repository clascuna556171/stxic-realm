import type {SupabaseClient} from '@supabase/supabase-js'
import {rpc} from './account-repository.ts'
export type StreamKind='channel'|'direct'
export type StreamMessage={id:string;author_id:string|null;body:string;created_at:string;client_id:string;revision:number;created_revision:number;removed_at:string|null;edited_at:string|null;channel_id?:string;conversation_id?:string}
export type Snapshot={messages:StreamMessage[];watermark:number;visibility?:string}
export type Recovery={reset:boolean;watermark:number;next:number;visibility?:string;messages:StreamMessage[];events:{message_id:string;revision:number;operation:string}[]}
export function mergeMessages(current:StreamMessage[],incoming:StreamMessage[],invalidated:string[]=[]):StreamMessage[]{
 const items=new Map(current.map(m=>[m.id,m]))
 for(const id of invalidated)if(!incoming.some(m=>m.id===id))items.delete(id)
 for(const message of incoming){const previous=items.get(message.id);if(!previous||(message.revision??0)>=(previous.revision??0))items.set(message.id,message)}
 return [...items.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
}
export const historyPage=(db:SupabaseClient,kind:StreamKind,id:string,before?:StreamMessage)=>rpc<Snapshot>(db,'message_history',{p_kind:kind,p_stream:id,p_before_time:before?.created_at??null,p_before_id:before?.id??null})
export async function recoverStream(db:SupabaseClient,kind:StreamKind,id:string,after:number,onPage:(page:Recovery)=>void):Promise<number>{
 let cursor=after,through:number|undefined
 do{
  const page=await rpc<Recovery>(db,'message_recover',{p_kind:kind,p_stream:id,p_after:cursor,p_through:through??null})
  if(page.reset){onPage(page);return -1}
  through=page.watermark
  if(page.next<cursor||page.next>through||page.next===cursor&&cursor<through)throw new Error('Message recovery was interrupted. Refresh to retry.')
  onPage(page);if(page.reset)return -1;cursor=page.next
 }while(cursor<through)
 return cursor
}
export function draftKey(user:string,kind:StreamKind,stream:string){return `realm.draft.v1:${user}:${kind}:${stream}`}
export function sameDraft(sentVersion:number,currentVersion:number){return sentVersion===currentVersion}
