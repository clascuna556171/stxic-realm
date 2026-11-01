import type { SupabaseClient } from '@supabase/supabase-js'
import { parseAppearance, type Appearance } from './appearance.ts'

export type Character = Omit<Appearance,'accent'|'logo'|'mood'> & {version:1}
export type Profile = { id:string; username:string; display_name:string; bio:string; revision:number; updated_at:string;avatar_path?:string;avatar_shape?:string;avatar_x?:number;avatar_y?:number;frame_id?:string;frame_effects?:boolean }
export type Identity = { profile:Profile; character:Character; theme:Pick<Appearance,'accent'|'logo'>; mood:Appearance['mood'] }
export type PublicIdentity = Profile & {character?:Character}
export type Friendship = {id:string;requester:string;addressee:string;status:'pending'|'accepted'}
export type Home = {owner_id:string;privacy:'private'|'friends';mood:Appearance['mood'];layout:import('./world/layout.ts').Layout;revision:number}
export type Visitor = {id:string;name:string;x:number;y:number;sequence:number;character:Character}
export type RoomState = {home:Home;owner:Profile;visitors:Visitor[];house_pets?:import('./pets/pet-model.ts').EquippedPetSummary[];wildlife_encounter?:import('./pets/pet-model.ts').WildlifeEncounter|null}

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
 if(code==='40001'||code==='PT409')return (error as {message?:string})?.message||'Changed in another tab or device. Reload before saving.'
 if(code==='PT429'){let retry=0;try{retry=Number(JSON.parse((error as {details?:string}).details??'{}').retry_after)||0}catch{/* Limits may omit a retry interval. */}return `${(error as {message?:string}).message||'Limit reached.'}${retry>0?` Try again in ${Math.ceil(retry)} seconds.`:''}`}
 return (error as {message?:string})?.message || 'Could not connect. Check your connection and try again.'
}
export async function rpc<T>(db:SupabaseClient,name:string,args?:Record<string,unknown>):Promise<T>{
 const {data,error}=await db.rpc(name,args)
 if(error)throw error
 return data as T
}
export async function invoke<T>(db:SupabaseClient,name:string,body:Record<string,unknown>|Blob,headers?:Record<string,string>):Promise<T>{
 // Installed functions-js omits Blob bodies when an invoke-level Content-Type is
 // provided. Binary callers let the SDK choose it; servers inspect the bytes.
 const {data,error}=await db.functions.invoke(name,{body,headers})
 if(error){const response=(error as {context?:unknown}).context
  if(response instanceof Response){let detail:{error?:string;code?:string}={};try{detail=await response.clone().json()}catch{/* A network proxy may return a non-JSON error. */}
   if(detail.error)throw {message:detail.error,code:detail.code??`PT${response.status}`,details:JSON.stringify({retry_after:Number(response.headers.get('Retry-After'))||0})}
  }
  throw error
 }
 return data as T
}
export const getIdentity=(db:SupabaseClient)=>rpc<Identity>(db,'get_identity')
export const saveIdentity=(db:SupabaseClient,p:Profile,a:Appearance)=>rpc<Identity>(db,'save_identity',identityPayload(p,a))
export async function publicIdentities(db:SupabaseClient,ids:string[]):Promise<Record<string,PublicIdentity>>{
 if(!ids.length)return {}
 const unique=[...new Set(ids)]
 const [profiles,characters,portraits]=await Promise.all([db.from('profiles').select('id,username,display_name,bio,revision,updated_at').in('id',unique),db.from('profile_appearances').select('user_id,character').in('user_id',unique),db.from('account_portraits').select('*').in('user_id',unique)])
 if(profiles.error)throw profiles.error;if(characters.error)throw characters.error
 return Object.fromEntries((profiles.data as Profile[]).map(p=>{const photo=portraits.data?.find(a=>a.user_id===p.id);return [p.id,{...p,...(photo?{avatar_path:photo.object_path,avatar_shape:photo.shape,avatar_x:Number(photo.x),avatar_y:Number(photo.y),frame_id:photo.frame_id,frame_effects:photo.frame_effects}:{}),character:characters.data.find(c=>c.user_id===p.id)?.character as Character|undefined}]}))
}
export async function getOwnHome(db:SupabaseClient,id:string):Promise<Home>{
 const {data,error}=await db.from('homes').select('owner_id,privacy,mood,layout,revision').eq('owner_id',id).single()
 if(error)throw error;return data as Home
}
