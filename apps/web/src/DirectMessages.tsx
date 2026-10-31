import {useEffect,useState} from 'react'
import {AccountGate,useAccount} from './Account'
import {errorText,publicIdentities,type PublicIdentity} from './account-repository'
import {client} from './data'
import {WorkspaceNav} from './WorkspaceNav'
import {MessageThread} from './MessageThread'
import {AccountPortrait} from './AccountPortrait'
export default function DirectMessages({id}:{id:string}){return <AccountGate><Conversation key={id} id={id}/></AccountGate>}
function Conversation({id}:{id:string}){
 const user=useAccount().session!.user.id,[peer,setPeer]=useState<PublicIdentity|null>(null),[error,setError]=useState('')
 useEffect(()=>{let active=true;void (async()=>{try{const {data,error}=await client!.from('direct_conversations').select('user_a,user_b').eq('id',id).single();if(error)throw new Error('Conversation unavailable. You must still be friends.');const other=data.user_a===user?data.user_b:data.user_a;const people=await publicIdentities(client!,[other]);if(active)setPeer(people[other]??null)}catch(e){if(active)setError(errorText(e))}})();return()=>{active=false}},[id,user])
 return <main className="workspace-page dm-page"><WorkspaceNav current="direct"/><header className="workspace-header"><div className="dm-peer-heading">{peer&&<a className="dm-peer-portrait" href={`/?profile=${peer.id}`} aria-label={`View ${peer.display_name} profile`}><AccountPortrait person={peer}/></a>}<strong>{peer?.display_name??'Direct message'}</strong>{peer&&<a href={`/?home=${peer.id}`}>Visit home</a>}</div><a href="/?friends">Back to friends</a></header><div className="dm-content">{error?<p className="error" role="alert">{error}</p>:<MessageThread kind="direct" id={id} title={`Message ${peer?.display_name??'your friend'}`}/>}</div></main>
}
