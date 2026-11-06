import {useEffect,useRef,useState,type RefObject} from 'react'
import {useModalFocus} from './useModalFocus'
import {client} from './data'
import {errorText} from './account-repository'
import type {StreamMessage} from './stream-repository'

/** Deliberate author consent; the RPC rechecks ownership, membership and source access. */
export function PreserveMessage({space,message,opener,onClose}:{space:string;message:StreamMessage;opener:RefObject<HTMLButtonElement|null>;onClose:()=>void}){
 const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false)
 const intent=useRef(crypto.randomUUID()),dialog=useModalFocus(true,opener),live=useRef(true)
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 // The enclosing thread owns this dialog's lifetime. Ignore late transport completions.
 return <div className="modal-backdrop" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose()}}}>
  <div ref={dialog} className="modal-dialog preserve-message" role="dialog" aria-modal="true" aria-labelledby="preserve-title" tabIndex={-1}>
   <h2 id="preserve-title">{saved?'Memory preserved':'Preserve your message'}</h2>
   {saved?<><p>Your message is now in this server’s community memory.</p><div className="modal-actions"><button onClick={onClose}>Back to conversation</button><a href={`/?server-hall=${encodeURIComponent(space)}&activity=memory`}>Open community memory</a></div></>:<form onSubmit={e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);void (async()=>{try{const {error}=await client!.rpc('community_change',{p_space:space,p_action:'memory_create',p_id:intent.current,p_data:{kind:'conversation',title,source:message.id}}).abortSignal(abort.signal);if(error)throw error;if(live.current)setSaved(true)}catch(e){if(live.current)setError(errorText(e))}finally{clearTimeout(timer);if(live.current)setBusy(false)}})()}}>
    <p>Share this message with members of this server. Only you can preserve your own message. Nothing else in the conversation is copied.</p>
    <blockquote className="memory-source">{message.body}</blockquote>
    <label>Memory title<input required maxLength={120} value={title} disabled={busy} onChange={e=>setTitle(e.target.value)}/></label>
    <p>The memory follows the source text. Deleting the message, archiving its channel, blocking, or losing membership hides it where required. You can edit its title or remove it from Memory.</p>
    {error&&<p role="alert">{error} Your title is still here. Check access or retry.</p>}
    <div className="modal-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={busy||!title.trim()}>{busy?'Preserving…':error?'Retry preserve memory':'Preserve memory'}</button></div>
   </form>}
  </div>
 </div>
}
