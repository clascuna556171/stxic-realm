import {ProfileImage} from './ProfileImage'
import {useEffect,useState} from 'react'
import {useAccount} from './Account'
import {client} from './data'
import type {Profile} from './account-repository'
import {profileImageUrl} from './profile-media'
import './account-profile.css'
export function AccountPortrait({person}:{person?:Pick<Profile,'display_name'|'avatar_path'|'avatar_shape'|'avatar_x'|'avatar_y'>}){
 const viewer=useAccount().session?.user.id??'',path=person?.avatar_path
 const [image,setImage]=useState<{path:string;url:string}|null>(null)
 useEffect(()=>{let alive=true;setImage(null);if(path&&client&&viewer)void profileImageUrl(client,path,viewer).then(url=>{if(alive)setImage({path,url})}).catch(()=>{});return()=>{alive=false}},[path,viewer])
 return <span className={`account-portrait shape-${person?.avatar_shape??'circle'}`} role="img" aria-label={`${person?.display_name??'Member'} account photo`}>{image?.path===path&&image?<ProfileImage src={image.url} alt="" style={{objectPosition:`${person?.avatar_x??50}% ${person?.avatar_y??50}%`}} onError={()=>setImage(null)}/>:<span aria-hidden="true">{person?.display_name?.trim().slice(0,2).toUpperCase()||'R'}</span>}</span>
}
