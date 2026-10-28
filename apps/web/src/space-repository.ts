import type {SupabaseClient} from '@supabase/supabase-js'
import type {Channel} from './data'
export type Space={id:string;name:string;revision:number;archived_at:string|null;closed_at:string|null}
export type Member={user_id:string;role:'owner'|'admin'|'moderator'|'member';name:string;username:string}
export type MembershipInvite={id:string;target:string;expires_at:string;accepted_at:string|null;revoked_at:string|null}
export type Restriction={id:string;user_id:string;kind:'mute'|'ban';reason:string;expires_at:string;channel_id:string|null}
export type SpaceData={members:Member[];invites:MembershipInvite[];restrictions:Restriction[]}
export async function listSpaces(db:SupabaseClient):Promise<Space[]>{const {data,error}=await db.from('spaces').select('id,name,revision,archived_at,closed_at').order('created_at');if(error)throw error;return data as Space[]}
export async function listChannels(db:SupabaseClient,space:string):Promise<Channel[]>{const {data,error}=await db.from('channels').select('id,name,space_id,archived_at,revision').eq('space_id',space).order('created_at');if(error)throw error;return data as Channel[]}
export const roleRank=(role:string|undefined)=>({owner:4,admin:3,moderator:2,member:1}[role??'']??0)
export function membershipToken(value:string){try{return new URL(value).searchParams.get('invite')??value}catch{return value}}
