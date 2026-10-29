import {ProfileFrame} from './ProfileFrame'
import {useEffect,useState} from 'react'
import {useAccount} from './Account'
import {client} from './data'
import type {Profile} from './account-repository'
import {profileImageUrl} from './profile-media'
import './account-profile.css'
export function AccountPortrait({person}:{person?:Pick<Profile,'display_name'|'avatar_path'|'avatar_shape'|'avatar_x'|'avatar_y'|'frame_id'|'frame_effects'>}){
 const viewer=useAccount().session?.user.id??'',path=person?.avatar_path
 const [image,setImage]=useState<{path:string;url:string}|null>(null)
 useEffect(()=>{let alive=true;setImage(null);if(path&&client&&viewer)void profileImageUrl(client,path,viewer).then(url=>{if(alive)setImage({path,url})}).catch(()=>{});return()=>{alive=false}},[path,viewer])
 return <ProfileFrame className="account-portrait" avatarSrc={image?.path===path?image?.url:undefined} frameId={person?.frame_id} frameShape={person?.avatar_shape} showEffects={false} focusX={person?.avatar_x} focusY={person?.avatar_y} label={`${person?.display_name??'Member'} account photo`} initials={person?.display_name?.trim().slice(0,2).toUpperCase()||'R'}/>
}
