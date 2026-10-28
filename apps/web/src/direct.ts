export type DirectMessage={id:string;author_id:string;body:string;created_at:string;client_id:string;conversation_id:string}
export function mergeDirectMessages(current:DirectMessage[],incoming:DirectMessage[]):DirectMessage[]{return [...new Map([...current,...incoming].map(m=>[m.id,m])).values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))}
