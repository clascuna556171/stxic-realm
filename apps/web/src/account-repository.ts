import type { SupabaseClient } from '@supabase/supabase-js'
import { parseAppearance, type Appearance } from './appearance.ts'

export type Character = Omit<Appearance,'accent'|'logo'|'mood'> & {version:1}
export type Profile = { id:string; username:string; display_name:string; bio:string; revision:number; updated_at:string }
export type Identity = { profile:Profile; character:Character; theme:Pick<Appearance,'accent'|'logo'>; mood:Appearance['mood'] }
export type PublicIdentity = Profile & {character?:Character}
export type Friendship = {id:string;requester:string;addressee:string;status:'pending'|'accepted'}
export type Home = {owner_id:string;privacy:'private'|'friends';mood:Appearance['mood'];layout:import('./world/layout.ts').Layout;revision:number}
export type Visitor = {id:string;name:string;x:number;y:number;sequence:number;character:Character}
export type RoomState = {home:Home;owner:Profile;visitors:Visitor[]}

export function appearanceFor(identity:Pick<Identity,'character'|'theme'|'mood'>):Appearance {
 return parseAppearance(JSON.stringify({...identity.character,...identity.theme,mood:identity.mood}))
}
export function identityPayload(profile:Profile,appearance:Appearance){
 const {accent,logo,mood,...character}=appearance
 return {p_username:profile.username.trim().toLowerCase(),p_name:profile.display_name.trim(),p_bio:profile.bio.trim(),p_character:{...character,version:1},p_theme:{accent,logo},p_mood:mood,p_revision:profile.revision}
}
export function errorText(error:unknown):string {
 const code=(error as {code?:string})?.code
 if(code==='23505')return 'That handle or request already exists. Choose another handle or check your requests.'
 if(code==='40001'||code==='PT409')return 'Changed in another tab or device. Reload from your account before saving.'
 return (error as {message?:string})?.message || 'Could not connect. Check your connection and try again.'
}
export async function rpc<T>(db:SupabaseClient,name:string,args?:Record<string,unknown>):Promise<T>{
 const {data,error}=await db.rpc(name,args)
 if(error)throw error
 return data as T
}
export const getIdentity=(db:SupabaseClient)=>rpc<Identity>(db,'get_identity')
export const saveIdentity=(db:SupabaseClient,p:Profile,a:Appearance)=>rpc<Identity>(db,'save_identity',identityPayload(p,a))
export async function publicIdentities(db:SupabaseClient,ids:string[]):Promise<Record<string,PublicIdentity>>{
 if(!ids.length)return {}
 const unique=[...new Set(ids)]
 const [profiles,characters]=await Promise.all([db.from('profiles').select('id,username,display_name,bio,revision,updated_at').in('id',unique),db.from('profile_appearances').select('user_id,character').in('user_id',unique)])
 if(profiles.error)throw profiles.error;if(characters.error)throw characters.error
 return Object.fromEntries((profiles.data as Profile[]).map(p=>[p.id,{...p,character:characters.data.find(c=>c.user_id===p.id)?.character as Character|undefined}]))
}
export async function getOwnHome(db:SupabaseClient,id:string):Promise<Home>{
 const {data,error}=await db.from('homes').select('owner_id,privacy,mood,layout,revision').eq('owner_id',id).single()
 if(error)throw error;return data as Home
}
